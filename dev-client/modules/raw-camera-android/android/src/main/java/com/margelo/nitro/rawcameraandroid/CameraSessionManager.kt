package com.margelo.nitro.rawcameraandroid

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.DngCreator
import android.hardware.camera2.TotalCaptureResult
import android.util.Log
import androidx.annotation.OptIn as AndroidXOptIn
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.ProcessLifecycleOwner
import com.margelo.nitro.NitroModules
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

// Process-wide CameraX session for the RAW capture pipeline. Two
// callers touch this:
//   - HybridRawCameraAndroid.capturePhoto() (imperative, from JS)
//   - RawCameraAndroidView (native Fabric view, contributes its
//     PreviewView's SurfaceProvider on attach + removes on detach)
//
// Kept as a Kotlin object (singleton) so both callers see the same
// bind state — the alternative (per-instance) would require a
// registry lookup from the view to the hybrid, which is fragile.
//
// Bind lifecycle:
//   - First attachSurfaceProvider() OR first capturePhoto() with no
//     view (blind mode) binds ImageCapture + a keep-alive stream
//     (ImageAnalysis if no surface, Preview if a surface is attached).
//   - detachSurfaceProvider() drops the Preview back to ImageAnalysis
//     keep-alive so the camera stays open across quick nav events.
//   - releaseIfIdle() called after capture completes in blind mode
//     (no view attached), leaves the session bound otherwise.
@AndroidXOptIn(ExperimentalCamera2Interop::class, ExperimentalGetImage::class)
object CameraSessionManager {
    private const val TAG = "RawCameraAndroid.Session"
    private const val CAPTURE_RESULT_TIMEOUT_MS = 5_000L
    // takePicture can hang forever on some hosts (RN Modal inside a
    // Dialog window seems to be one — Camera2's still-capture request
    // never fires the OnImageCapturedCallback). Bail out and surface
    // the failure so the mutex releases and the JS side sees an error.
    private const val TAKE_PICTURE_TIMEOUT_MS = 8_000L

    private val context: Context
        get() =
            NitroModules.applicationContext
                ?: throw IllegalStateException(
                    "CameraSessionManager: no ReactApplicationContext available"
                )

    private val provider: ProcessCameraProvider by lazy {
        Log.i(TAG, "provider: acquiring ProcessCameraProvider…")
        val p = ProcessCameraProvider.getInstance(context).get()
        Log.i(TAG, "provider: got ProcessCameraProvider")
        p
    }

    // Dedicated background executor for the ImageAnalysis keep-alive
    // analyzer. Using the main-thread executor stalls the repeating
    // request when the JS thread / RN UI is busy (which is enough to
    // hang takePicture — Camera2 needs the repeating stream to be
    // running before still capture completes). Single thread is fine:
    // the analyzer just closes each frame.
    private val analysisExecutor = Executors.newSingleThreadExecutor()

    private val mutex = Mutex()

    private var boundImageCapture: ImageCapture? = null
    private var boundPreview: Preview? = null
    private var boundAnalysis: ImageAnalysis? = null
    private var boundCharacteristics: CameraCharacteristics? = null
    private var boundCamera: Camera? = null

    // Currently-attached surface provider, if any. Set by the view on
    // window attach; null in blind mode. When non-null, ensureBound()
    // uses Preview (rendered) as the keep-alive; when null, it uses a
    // discard-only ImageAnalysis.
    @Volatile private var currentSurfaceProvider: Preview.SurfaceProvider? = null

    // Phase-8 real-time overlay callback. Called on the
    // analysisExecutor thread (background). The view is responsible
    // for hopping to main + invalidate. Null when no view is
    // subscribed. Colour codes match RoiOverlayView's constants:
    // 0=red (bad), 1=green (good), -1=unknown.
    @Volatile private var frameColorListener: ((refCode: Int, sampleCode: Int) -> Unit)? =
        null

    // Reusable per-frame output buffer for the analyzer. Only touched
    // from the single-threaded analysisExecutor, so no synchronization
    // needed. Allocation-free steady state.
    private val statsBuf = DoubleArray(3)

    // Variance threshold below which a ROI is considered "consistent"
    // (green). Tuned to well-lit reference cards on Pixel 6a; a real
    // implementation may want per-illumination tuning, but this gives
    // a usable red/green flip for phase-8.2 validation.
    private const val VARIANCE_GREEN_THRESHOLD = 200.0

    fun setFrameColorListener(cb: ((refCode: Int, sampleCode: Int) -> Unit)?) {
        frameColorListener = cb
    }

    // Slot for the next TotalCaptureResult. See per-capture protocol
    // below; each capture assigns its own deferred before triggering
    // takePicture.
    @Volatile private var pendingResult: CompletableDeferred<TotalCaptureResult>? = null

    // Called from RawCameraAndroidView.onAttachedToWindow. Rebinds the
    // session with Preview instead of ImageAnalysis if we were already
    // bound.
    suspend fun attachSurfaceProvider(sp: Preview.SurfaceProvider) {
        mutex.withLock {
            currentSurfaceProvider = sp
            Log.i(TAG, "attachSurfaceProvider: rebinding with Preview")
            unbindAllLocked()
            ensureBoundLocked()
        }
    }

    // Called from RawCameraAndroidView.onDetachedFromWindow.
    suspend fun detachSurfaceProvider() {
        mutex.withLock {
            currentSurfaceProvider = null
            Log.i(TAG, "detachSurfaceProvider: rebinding without preview")
            unbindAllLocked()
            // Don't rebind eagerly — no view + no capture request means
            // no reason to keep the camera open. Next capturePhoto will
            // rebind lazily.
        }
    }

    // Imperative capture. Reuses the currently-bound session if one is
    // already up (view-attached case), or binds a headless session with
    // an ImageAnalysis keep-alive (blind mode).
    suspend fun capture(): CapturedPhoto =
        mutex.withLock {
            Log.i(TAG, "capture: entered")
            requireCameraPermission()
            val (imageCapture, characteristics) = ensureBoundLocked()

            val resultDeferred = CompletableDeferred<TotalCaptureResult>()
            pendingResult = resultDeferred
            Log.i(TAG, "capture: triggering takePicture…")

            val image: ImageProxy =
                try {
                    withTimeout(TAKE_PICTURE_TIMEOUT_MS) {
                        takePictureSuspending(imageCapture)
                    }
                } catch (e: Throwable) {
                    pendingResult = null
                    Log.e(TAG, "capture: takePicture failed", e)
                    throw RuntimeException(
                        "takePicture failed (or timed out after ${TAKE_PICTURE_TIMEOUT_MS}ms)",
                        e,
                    )
                }
            Log.i(
                TAG,
                "capture: takePicture returned image ${image.width}x${image.height}"
            )

            val totalResult: TotalCaptureResult =
                try {
                    withTimeout(CAPTURE_RESULT_TIMEOUT_MS) { resultDeferred.await() }
                } catch (e: Throwable) {
                    image.close()
                    throw RuntimeException(
                        "Timed out waiting for TotalCaptureResult (${CAPTURE_RESULT_TIMEOUT_MS}ms)",
                        e,
                    )
                } finally {
                    pendingResult = null
                }

            val result = writeDngFile(image, characteristics, totalResult)
            image.close()

            // In blind mode (no attached view) release the session so
            // libgcam doesn't spam metering-error logs on every frame.
            // In view-attached mode leave it bound — the view still
            // needs the preview stream.
            if (currentSurfaceProvider == null) {
                Log.i(TAG, "capture: no attached view, releasing session")
                unbindAllLocked()
            }
            result
        }

    private fun requireCameraPermission() {
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) !=
                PackageManager.PERMISSION_GRANTED
        ) {
            throw SecurityException(
                "Camera permission not granted — request it via the JS side first"
            )
        }
    }

    private suspend fun ensureBoundLocked(): Pair<ImageCapture, CameraCharacteristics> {
        boundImageCapture?.let { ic ->
            boundCharacteristics?.let { chars -> return ic to chars }
        }
        Log.i(TAG, "ensureBound: initializing session…")

        val builder = ImageCapture.Builder().setBufferFormat(ImageFormat.RAW_SENSOR)
        Camera2Interop.Extender(builder)
            .setSessionCaptureCallback(
                object : CameraCaptureSession.CaptureCallback() {
                    override fun onCaptureCompleted(
                        session: CameraCaptureSession,
                        request: CaptureRequest,
                        result: TotalCaptureResult,
                    ) {
                        pendingResult?.complete(result)
                    }

                    override fun onCaptureFailed(
                        session: CameraCaptureSession,
                        request: CaptureRequest,
                        failure: android.hardware.camera2.CaptureFailure,
                    ) {
                        pendingResult?.completeExceptionally(
                            RuntimeException(
                                "Camera2 capture failed: reason=${failure.reason}"
                            )
                        )
                    }
                }
            )
        val imageCapture = builder.build()

        // Keep-alive stream + phase-8 analyzer.
        //   - Blind mode (no surface): ImageAnalysis with a discard-only
        //     analyzer. Preview isn't rendered anywhere so we skip it.
        //   - View attached: Preview (rendered) + ImageAnalysis (feeds
        //     the phase-8 overlay analyzer). Camera2 needs one repeating
        //     request for still capture to fire; Preview provides that.
        //
        // A previous attempt to bind Preview + ImageAnalysis + ImageCapture
        // together on Pixel 6a hung takePicture indefinitely, but that
        // was inside a RN Modal (Dialog window) where the preview surface
        // never actually rendered. Now that we use a full-screen
        // navigation route, the triple bind seems to work — worth
        // watching if takePicture ever regresses.
        val surface = currentSurfaceProvider
        val preview: Preview? =
            if (surface != null) {
                Preview.Builder().build().also { p ->
                    withContext(Dispatchers.Main) { p.setSurfaceProvider(surface) }
                }
            } else {
                null
            }
        val analysis: ImageAnalysis =
            ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { a ->
                    a.setAnalyzer(analysisExecutor) { proxy ->
                        try {
                            analyzeFrame(proxy)
                        } finally {
                            proxy.close()
                        }
                    }
                }

        val useCases = listOfNotNull(preview, analysis, imageCapture).toTypedArray()

        Log.i(
            TAG,
            "ensureBound: binding ${useCases.size} use cases (preview=${preview != null}, analysis=true)"
        )
        val camera =
            withContext(Dispatchers.Main) {
                provider.bindToLifecycle(
                    ProcessLifecycleOwner.get(),
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    *useCases,
                )
            }
        val cameraInfo = Camera2CameraInfo.from(camera.cameraInfo)
        val characteristics = fetchCharacteristics(cameraInfo)

        val capabilities =
            characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                ?: IntArray(0)
        if (
            !capabilities.contains(
                CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW
            )
        ) {
            withContext(Dispatchers.Main) { provider.unbindAll() }
            throw UnsupportedOperationException(
                "Back camera does not advertise REQUEST_AVAILABLE_CAPABILITIES_RAW"
            )
        }

        Log.i(TAG, "ensureBound: camera=${cameraInfo.cameraId} RAW capable")
        boundCamera = camera
        boundImageCapture = imageCapture
        boundPreview = preview
        boundAnalysis = analysis
        boundCharacteristics = characteristics
        return imageCapture to characteristics
    }

    // Must be called with mutex held.
    private suspend fun unbindAllLocked() {
        if (boundImageCapture == null && boundPreview == null && boundAnalysis == null) {
            return
        }
        withContext(Dispatchers.Main) {
            Log.i(TAG, "unbindAll")
            provider.unbindAll()
        }
        boundCamera = null
        boundImageCapture = null
        boundPreview = null
        boundAnalysis = null
        boundCharacteristics = null
    }

    private fun fetchCharacteristics(camera2Info: Camera2CameraInfo): CameraCharacteristics {
        val cameraManager =
            context.getSystemService(Context.CAMERA_SERVICE)
                as android.hardware.camera2.CameraManager
        return cameraManager.getCameraCharacteristics(camera2Info.cameraId)
    }

    private suspend fun takePictureSuspending(imageCapture: ImageCapture): ImageProxy {
        val executor = ContextCompat.getMainExecutor(context)
        return suspendCancellableCoroutine { cont ->
            imageCapture.takePicture(
                executor,
                object : ImageCapture.OnImageCapturedCallback() {
                    override fun onCaptureSuccess(image: ImageProxy) {
                        cont.resume(image)
                    }

                    override fun onError(exception: ImageCaptureException) {
                        cont.resumeWithException(exception)
                    }
                },
            )
        }
    }

    private fun writeDngFile(
        image: ImageProxy,
        characteristics: CameraCharacteristics,
        result: TotalCaptureResult,
    ): CapturedPhoto {
        val underlyingImage =
            image.image
                ?: throw RuntimeException(
                    "ImageProxy has no underlying android.media.Image"
                )
        val cacheDir = context.cacheDir
        val tempFile = File.createTempFile("RawCameraAndroid_", ".dng", cacheDir)
        DngCreator(characteristics, result).use { creator ->
            val sensorOrientation =
                characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
            creator.setOrientation(exifOrientationForRotation(sensorOrientation))
            FileOutputStream(tempFile).use { stream ->
                creator.writeImage(stream, underlyingImage)
            }
        }
        Log.i(
            TAG,
            "DNG written: path=${tempFile.absolutePath} size=${tempFile.length()} " +
                "width=${image.width} height=${image.height}"
        )
        return CapturedPhoto(
            dngPath = "file://${tempFile.absolutePath}",
            width = image.width.toDouble(),
            height = image.height.toDouble(),
        )
    }

    private fun exifOrientationForRotation(degrees: Int): Int =
        when ((degrees % 360 + 360) % 360) {
            0 -> android.media.ExifInterface.ORIENTATION_NORMAL
            90 -> android.media.ExifInterface.ORIENTATION_ROTATE_90
            180 -> android.media.ExifInterface.ORIENTATION_ROTATE_180
            270 -> android.media.ExifInterface.ORIENTATION_ROTATE_270
            else -> android.media.ExifInterface.ORIENTATION_NORMAL
        }

    // Phase-8 real-time analyzer. Runs on the single-threaded
    // analysisExecutor. Skips entirely when nobody's subscribed (JS
    // isn't showing the overlay), so the CameraX repeating request
    // still fires but we don't waste JNI + native cycles on a frame
    // no one will look at.
    private fun analyzeFrame(proxy: ImageProxy) {
        val listener = frameColorListener ?: return
        if (proxy.format != ImageFormat.YUV_420_888) return
        val yPlane = proxy.planes[0]
        val w = proxy.width
        val h = proxy.height

        // Hardcoded phase-8.2 ROIs in Y-plane (sensor) coordinates.
        // Pixel 6a's rear camera is landscape 4:3 with rotationDegrees=90,
        // so display-portrait maps to sensor-landscape rotated 90° CW.
        // Under that mapping, the overlay's top rect (display fractions
        // 0.15..0.85 x 0.10..0.40) lands on the sensor's LEFT stripe
        // (0.10..0.40 x 0.15..0.85), and the overlay's bottom rect on
        // the RIGHT stripe. Phase 8.3 will replace this with a shared
        // ROI source driven from JS so the overlay + analyzer stay in
        // sync across orientations + devices.
        val refCode = analyzeRoiToCode(
            yPlane, w, h,
            (0.10f * w).toInt(), (0.15f * h).toInt(),
            (0.30f * w).toInt(), (0.70f * h).toInt(),
        )
        val sampleCode = analyzeRoiToCode(
            yPlane, w, h,
            (0.55f * w).toInt(), (0.15f * h).toInt(),
            (0.30f * w).toInt(), (0.70f * h).toInt(),
        )
        listener(refCode, sampleCode)
    }

    private fun analyzeRoiToCode(
        yPlane: ImageProxy.PlaneProxy,
        planeWidth: Int,
        planeHeight: Int,
        x: Int,
        y: Int,
        w: Int,
        h: Int,
    ): Int {
        FrameAnalyzer.nativeAnalyzeYPlane(
            yPlane.buffer,
            yPlane.rowStride,
            planeWidth,
            planeHeight,
            x,
            y,
            w,
            h,
            statsBuf,
        )
        val variance = statsBuf[FrameAnalyzer.OUT_VARIANCE]
        return if (variance < VARIANCE_GREEN_THRESHOLD) {
            RoiOverlayView.COLOR_GREEN
        } else {
            RoiOverlayView.COLOR_RED
        }
    }
}
