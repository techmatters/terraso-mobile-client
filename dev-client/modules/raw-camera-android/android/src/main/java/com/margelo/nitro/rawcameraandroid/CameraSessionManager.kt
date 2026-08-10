package com.margelo.nitro.rawcameraandroid

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CaptureResult
import android.hardware.camera2.DngCreator
import android.hardware.camera2.TotalCaptureResult
import android.util.Log
import android.util.Rational
import android.view.Surface
import androidx.annotation.OptIn as AndroidXOptIn
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.AspectRatio
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.core.ViewPort
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
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
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
    // Companion JPEG capture bound alongside the RAW ImageCapture. Fires
    // on the same shutter press so the RAW and JPEG represent the SAME
    // instant (identical sensor state, framing, timing). The JPEG stream
    // deliberately does NOT get applyWysiwygRequestOptions — it uses the
    // HAL's default photo processing pipeline (HDR+ / distortion
    // correction / tone map / sharpening / etc.) so the JPEG matches
    // what the stock camera app would produce for the same scene.
    // Useful for A/B-ing our RAW colour pipeline against the HAL's
    // normal photo output.
    //
    // TODO: consider switching to ImageCapture.OUTPUT_FORMAT_RAW_JPEG
    // (single use case, one shutter, both files) when we require
    // CameraX >= 1.4 unconditionally. That would remove the two-stream
    // stream-combination pressure and drop the parallel-await complexity
    // in capture().
    private var boundJpegCapture: ImageCapture? = null
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
            val (imageCapture, jpegCapture, characteristics) = ensureBoundLocked()

            val resultDeferred = CompletableDeferred<TotalCaptureResult>()
            pendingResult = resultDeferred
            Log.i(TAG, "capture: triggering takePicture (raw + jpeg)…")

            // Fire both captures on the same shutter so RAW and JPEG
            // represent the same instant. CameraX serialises still-
            // capture requests on the underlying CameraCaptureSession,
            // so "parallel" here means we hand both requests off without
            // waiting between them; the HAL queues them tightly.
            //
            // The JPEG file is created up front so we control the path
            // (matched stem to the DNG lets downstream tooling pair the
            // two by filename).
            val jpegFile =
                File.createTempFile("RawCameraAndroid_", ".jpg", context.cacheDir)
            val executor = ContextCompat.getMainExecutor(context)

            coroutineScope {
                val rawJob = async(Dispatchers.Main) {
                    takePictureSuspending(imageCapture)
                }
                val jpegJob = async(Dispatchers.Main) {
                    takePictureToFileSuspending(jpegCapture, jpegFile, executor)
                }

                val image: ImageProxy =
                    try {
                        withTimeout(TAKE_PICTURE_TIMEOUT_MS) { rawJob.await() }
                    } catch (e: Throwable) {
                        pendingResult = null
                        jpegJob.cancel()
                        Log.e(TAG, "capture: RAW takePicture failed", e)
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
                        jpegJob.cancel()
                        throw RuntimeException(
                            "Timed out waiting for TotalCaptureResult (${CAPTURE_RESULT_TIMEOUT_MS}ms)",
                            e,
                        )
                    } finally {
                        pendingResult = null
                    }

                // JPEG is a companion — don't fail the whole capture if
                // only it errors. RAW is the primary output; jpegPath
                // going null just means the caller can't A/B against a
                // HAL-processed photo.
                val jpegPath: String? =
                    try {
                        withTimeout(TAKE_PICTURE_TIMEOUT_MS) { jpegJob.await() }
                        Log.i(
                            TAG,
                            "capture: JPEG written to ${jpegFile.absolutePath}"
                        )
                        "file://${jpegFile.absolutePath}"
                    } catch (e: Throwable) {
                        Log.w(
                            TAG,
                            "capture: JPEG capture failed (continuing with RAW only)",
                            e,
                        )
                        jpegFile.delete()
                        null
                    }

                val result = writeDngFile(image, characteristics, totalResult, jpegPath)
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
        }

    // Applies the WYSIWYG-guaranteeing capture request options to any
    // use case's Camera2Interop.Extender. Called on Preview, ImageCapture,
    // and ImageAnalysis so all three streams share the same
    // uncorrected FoV.
    //
    //   DISTORTION_CORRECTION_MODE = OFF: some Camera2 HALs (notably
    //     Pixel devices) apply digital lens distortion correction to
    //     YUV/Preview/JPEG streams but not to RAW_SENSOR. The corrected
    //     streams end up showing a narrower FoV than RAW (corners shaved
    //     off), so what the user frames on-screen doesn't match the DNG.
    //     Turning this off makes Preview show the raw sensor FoV. If a
    //     device doesn't support OFF the HAL silently ignores it.
    //
    //   CONTROL_VIDEO_STABILIZATION_MODE = OFF: preview stabilization
    //     usually applies an inward crop to have room to stabilize.
    //     Same FoV-shaving effect as distortion correction. Off by
    //     default on most devices but not all — set explicitly for
    //     safety.
    private fun applyWysiwygRequestOptions(ext: Camera2Interop.Extender<*>) {
        ext.setCaptureRequestOption(
            CaptureRequest.DISTORTION_CORRECTION_MODE,
            CameraMetadata.DISTORTION_CORRECTION_MODE_OFF,
        )
        ext.setCaptureRequestOption(
            CaptureRequest.CONTROL_VIDEO_STABILIZATION_MODE,
            CameraMetadata.CONTROL_VIDEO_STABILIZATION_MODE_OFF,
        )
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

    private data class BoundSession(
        val rawCapture: ImageCapture,
        val jpegCapture: ImageCapture,
        val characteristics: CameraCharacteristics,
    )

    private suspend fun ensureBoundLocked(): BoundSession {
        boundImageCapture?.let { ic ->
            boundJpegCapture?.let { jc ->
                boundCharacteristics?.let { chars ->
                    return BoundSession(ic, jc, chars)
                }
            }
        }
        Log.i(TAG, "ensureBound: initializing session…")

        val builder = ImageCapture.Builder()
            .setBufferFormat(ImageFormat.RAW_SENSOR)
            // Sensor's native aspect on the Pixel 6a (and virtually every
            // Android phone) is 4:3 landscape → 3:4 portrait after
            // rotation. Force it here so the RAW capture matches the
            // Preview use case's FoV — without an explicit ratio,
            // CameraX may independently negotiate different aspects for
            // Preview vs Capture, which desyncs on-screen framing from
            // what actually lands in the DNG (chart validator relies on
            // WYSIWYG).
            .setTargetAspectRatio(AspectRatio.RATIO_4_3)
        val imageCaptureExt = Camera2Interop.Extender(builder)
        applyWysiwygRequestOptions(imageCaptureExt)
        imageCaptureExt.setSessionCaptureCallback(
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

        // Companion JPEG ImageCapture. Uses HAL default processing
        // (CAPTURE_MODE_MINIMIZE_LATENCY yields the same pipeline the
        // stock camera app uses for a normal photo: HDR+ / distortion
        // correction / tone map / sharpening / white balance).
        // Deliberately does NOT get applyWysiwygRequestOptions so the
        // JPEG reflects "what a normal photo looks like" — the whole
        // point of capturing it alongside the RAW.
        val jpegBuilder = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .setTargetAspectRatio(AspectRatio.RATIO_4_3)
        val jpegCapture = jpegBuilder.build()

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
                val previewBuilder = Preview.Builder()
                    // Match ImageCapture's aspect (see above) so the on-
                    // screen preview shows the same FoV as the captured
                    // DNG. Without this Preview defaults to something
                    // near the display aspect (9:16-ish on tall phones),
                    // which is a narrow vertical strip of the 4:3
                    // sensor — the user frames tight but the DNG has
                    // ~2× the horizontal FoV.
                    .setTargetAspectRatio(AspectRatio.RATIO_4_3)
                applyWysiwygRequestOptions(Camera2Interop.Extender(previewBuilder))
                previewBuilder.build().also { p ->
                    withContext(Dispatchers.Main) { p.setSurfaceProvider(surface) }
                }
            } else {
                null
            }
        val analysisBuilder = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setTargetAspectRatio(AspectRatio.RATIO_4_3)
        applyWysiwygRequestOptions(Camera2Interop.Extender(analysisBuilder))
        val analysis: ImageAnalysis =
            analysisBuilder.build().also { a ->
                a.setAnalyzer(analysisExecutor) { proxy ->
                    try {
                        analyzeFrame(proxy)
                    } finally {
                        proxy.close()
                    }
                }
            }

        // Wrap the use cases in a UseCaseGroup with a ViewPort so
        // CameraX crops Preview + ImageCapture + ImageAnalysis to the
        // SAME rectangle on the sensor. Without this the crops can
        // diverge even when target aspects match — WYSIWYG for the
        // chart validator depends on the on-screen preview and the
        // captured DNG covering the exact same field of view.
        // Rational(3, 4) = width:height in DISPLAY orientation (i.e.
        // portrait 3:4 to match SENSOR_ASPECT_PORTRAIT on the JS side).
        // ROTATION_0 = display-portrait; if we ever add landscape UI
        // this needs to become the current display rotation.
        val viewPort = ViewPort.Builder(Rational(3, 4), Surface.ROTATION_0)
            .setScaleType(ViewPort.FILL_CENTER)
            .build()
        // Try binding Preview + Analysis + RAW + JPEG (4 streams) first
        // — LEVEL_3 Camera2 devices are supposed to support this combo,
        // but in practice not all do (Pixel 6a errors with "No supported
        // surface combination"). If that fails, retry without Analysis
        // (Preview provides the repeating-request keep-alive; the phase-8
        // real-time overlay just won't have per-frame data). In blind
        // mode (no Preview surface) Analysis stays in as the keep-alive.
        val buildGroup = { includeAnalysis: Boolean ->
            val b = UseCaseGroup.Builder().setViewPort(viewPort)
            b.addUseCase(imageCapture)
            b.addUseCase(jpegCapture)
            if (includeAnalysis) b.addUseCase(analysis)
            if (preview != null) b.addUseCase(preview)
            b.build()
        }
        val analysisBoundRef = arrayOf(false)
        val camera =
            withContext(Dispatchers.Main) {
                val fullGroup = buildGroup(true)
                Log.i(
                    TAG,
                    "ensureBound: binding preview=${preview != null} analysis=true jpeg=true raw=true (viewport 3:4 portrait)"
                )
                try {
                    val c = provider.bindToLifecycle(
                        ProcessLifecycleOwner.get(),
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        fullGroup,
                    )
                    analysisBoundRef[0] = true
                    c
                } catch (e: IllegalArgumentException) {
                    // Preview-mode fallback only — in blind mode Analysis
                    // is the keep-alive and we must not drop it.
                    if (preview == null) throw e
                    Log.w(
                        TAG,
                        "4-stream bind failed on this device, retrying without ImageAnalysis (phase-8 overlay will be inactive)",
                        e,
                    )
                    val fallbackGroup = buildGroup(false)
                    provider.bindToLifecycle(
                        ProcessLifecycleOwner.get(),
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        fallbackGroup,
                    )
                }
            }
        val analysisWasBound = analysisBoundRef[0]
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

        // Diagnostic dump: sensor's physical vs "active" (post-crop)
        // dims, plus the actual resolution each use case negotiated.
        // Chart-validator WYSIWYG requires Preview's angular FoV to
        // match ImageCapture's — if Preview shows a NARROWER FoV than
        // RAW captures, the user frames tight but the DNG contains
        // more area than what was on-screen.
        val pixelArraySize =
            characteristics.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE)
        val activeArraySize =
            characteristics.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
        val preCorrectionActiveArraySize =
            characteristics.get(
                CameraCharacteristics.SENSOR_INFO_PRE_CORRECTION_ACTIVE_ARRAY_SIZE
            )
        val rawSize =
            characteristics
                .get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                ?.getOutputSizes(ImageFormat.RAW_SENSOR)
                ?.maxByOrNull { it.width * it.height }
        val distortionModes =
            characteristics.get(CameraCharacteristics.DISTORTION_CORRECTION_AVAILABLE_MODES)
                ?.toList()
        val stabilizationModes =
            characteristics.get(
                CameraCharacteristics.CONTROL_AVAILABLE_VIDEO_STABILIZATION_MODES
            )?.toList()
        Log.i(
            TAG,
            "SENSOR: pixelArray=${pixelArraySize} activeArray=${activeArraySize} " +
                "preCorrectionActiveArray=${preCorrectionActiveArraySize} maxRawSize=${rawSize} " +
                "distortionModes=${distortionModes} stabilizationModes=${stabilizationModes}"
        )
        Log.i(TAG, "PREVIEW resolutionInfo=${preview?.resolutionInfo}")
        Log.i(TAG, "CAPTURE resolutionInfo=${imageCapture.resolutionInfo}")
        Log.i(TAG, "ANALYSIS resolutionInfo=${analysis.resolutionInfo}")

        boundCamera = camera
        boundImageCapture = imageCapture
        boundJpegCapture = jpegCapture
        boundPreview = preview
        boundAnalysis = if (analysisWasBound) analysis else null
        boundCharacteristics = characteristics
        return BoundSession(imageCapture, jpegCapture, characteristics)
    }

    // Must be called with mutex held.
    private suspend fun unbindAllLocked() {
        if (boundImageCapture == null && boundJpegCapture == null &&
            boundPreview == null && boundAnalysis == null) {
            return
        }
        withContext(Dispatchers.Main) {
            Log.i(TAG, "unbindAll")
            provider.unbindAll()
        }
        boundCamera = null
        boundImageCapture = null
        boundJpegCapture = null
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

    // JPEG variant: hands takePicture an OutputFileOptions target so
    // CameraX writes the encoded JPEG to disk itself (no ImageProxy
    // decode + re-encode round-trip). Resumes once the file is closed.
    private suspend fun takePictureToFileSuspending(
        imageCapture: ImageCapture,
        outFile: File,
        executor: java.util.concurrent.Executor,
    ): Unit {
        val outputFileOptions =
            ImageCapture.OutputFileOptions.Builder(outFile).build()
        return suspendCancellableCoroutine { cont ->
            imageCapture.takePicture(
                outputFileOptions,
                executor,
                object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                        cont.resume(Unit)
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
        jpegPath: String?,
    ): CapturedPhoto {
        val underlyingImage =
            image.image
                ?: throw RuntimeException(
                    "ImageProxy has no underlying android.media.Image"
                )
        // Diagnostic: the actual sensor crop the HAL used for this still
        // capture. If this rect is SMALLER than SENSOR_INFO_ACTIVE_ARRAY_SIZE,
        // the RAW covers a narrower FoV than the full sensor. If it MATCHES
        // active array but Preview showed a smaller FoV on-screen, the
        // HAL is applying an implicit crop to preview that isn't reflected
        // in the still-capture result.
        val cropRegion = result.get(CaptureResult.SCALER_CROP_REGION)
        val distortionMode = result.get(CaptureResult.DISTORTION_CORRECTION_MODE)
        val stabilizationMode =
            result.get(CaptureResult.CONTROL_VIDEO_STABILIZATION_MODE)
        Log.i(
            TAG,
            "CAPTURE result: sensorCropRegion=${cropRegion} " +
                "distortionMode=${distortionMode} stabilizationMode=${stabilizationMode}"
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
            jpegPath = jpegPath,
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
