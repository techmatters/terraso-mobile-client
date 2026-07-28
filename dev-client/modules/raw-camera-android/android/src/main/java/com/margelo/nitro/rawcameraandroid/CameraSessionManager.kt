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
                    takePictureSuspending(imageCapture)
                } catch (e: Throwable) {
                    pendingResult = null
                    throw e
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

        // Keep-alive selection: with a surface provider, use Preview
        // (rendered); without, use an ImageAnalysis with a discard-only
        // analyzer. Either provides the repeating request Camera2 needs
        // for still capture.
        val surface = currentSurfaceProvider
        val preview: Preview? =
            if (surface != null) {
                Preview.Builder().build().also { p ->
                    // Preview.setSurfaceProvider must run on main thread.
                    withContext(Dispatchers.Main) { p.setSurfaceProvider(surface) }
                }
            } else {
                null
            }
        val analysis: ImageAnalysis? =
            if (surface == null) {
                ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .also { a ->
                        a.setAnalyzer(ContextCompat.getMainExecutor(context)) {
                            it.close()
                        }
                    }
            } else {
                null
            }

        val useCases = listOfNotNull(preview, analysis, imageCapture).toTypedArray()

        Log.i(
            TAG,
            "ensureBound: binding ${useCases.size} use cases (preview=${preview != null}, analysis=${analysis != null})"
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
}
