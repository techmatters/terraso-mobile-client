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
import androidx.annotation.Keep
import androidx.annotation.OptIn as AndroidXOptIn
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.SurfaceRequest
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.common.internal.DoNotStrip
import com.facebook.react.bridge.UiThreadUtil
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
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

// Phase-7.1 Android RAW capture via CameraX + Camera2Interop + DngCreator.
// See docs/raw-camera-plan.md phase 7.
//
// Session lifecycle: bound lazily on first capturePhoto() call and kept
// alive for the app's process lifetime (ProcessLifecycleOwner). Repeated
// captures reuse the same ImageCapture use case — no rebind cost per
// shutter. Preview surface is not managed here (phase 7.2 will add a
// Fabric view whose lifecycle attaches its SurfaceProvider to a shared
// Preview use case).
//
// TotalCaptureResult (needed by DngCreator) is intercepted via
// Camera2Interop.Extender's SessionCaptureCallback because CameraX
// doesn't surface it. onCaptureSuccess (ImageProxy) and onCaptureCompleted
// (TotalCaptureResult) can arrive in either order — we await both via
// CompletableDeferred + coroutines and only then invoke DngCreator.
@DoNotStrip
@Keep
@AndroidXOptIn(ExperimentalCamera2Interop::class, ExperimentalGetImage::class)
class HybridRawCameraAndroid : HybridRawCameraAndroidSpec() {
    companion object {
        private const val TAG = "RawCameraAndroid"

        // TotalCaptureResult can arrive noticeably after onCaptureSuccess
        // on some devices — 5s is comfortably longer than any real
        // capture latency but short enough to fail fast if the callback
        // is silently dropped.
        private const val CAPTURE_RESULT_TIMEOUT_MS = 5_000L
    }

    private val context: Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException(
                "RawCameraAndroid: no ReactApplicationContext available"
            )

    private val provider: ProcessCameraProvider by lazy {
        // ProcessCameraProvider.getInstance returns a ListenableFuture;
        // .get() blocks the calling thread. Safe to lazy-init inside a
        // capture coroutine (which runs off the main thread).
        ProcessCameraProvider.getInstance(context).get()
    }

    // Serialize capturePhoto calls — CameraX ImageCapture is not
    // reentrant, and even if it were the pending-CaptureResult state
    // below would race.
    private val captureMutex = Mutex()

    // Session state — bound lazily by ensureBound(), shared by all
    // capturePhoto invocations.
    private var boundCamera: Camera? = null
    private var boundImageCapture: ImageCapture? = null
    private var boundCharacteristics: CameraCharacteristics? = null

    // Slot for the next TotalCaptureResult. The SessionCaptureCallback
    // installed on the ImageCapture builder writes to this whenever a
    // capture completes; each capturePhoto call swaps in its own
    // deferred before triggering the shutter, then awaits it.
    @Volatile private var pendingResult: CompletableDeferred<TotalCaptureResult>? = null

    override fun capturePhoto(): Promise<CapturedPhoto> {
        return Promise.async {
            captureMutex.withLock { capturePhotoLocked() }
        }
    }

    private suspend fun capturePhotoLocked(): CapturedPhoto {
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) !=
                PackageManager.PERMISSION_GRANTED
        ) {
            throw SecurityException(
                "Camera permission not granted — request it via the JS side first"
            )
        }

        val (imageCapture, characteristics) = ensureBound()

        // Fresh deferred per capture. Assigned BEFORE calling takePicture
        // so the SessionCaptureCallback can never fire without a slot to
        // deliver into.
        val resultDeferred = CompletableDeferred<TotalCaptureResult>()
        pendingResult = resultDeferred

        val image: ImageProxy =
            try {
                takePictureSuspending(imageCapture)
            } catch (e: Throwable) {
                pendingResult = null
                throw e
            }

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

        return writeDngFile(image, characteristics, totalResult).also { image.close() }
    }

    private suspend fun ensureBound(): Pair<ImageCapture, CameraCharacteristics> {
        boundImageCapture?.let { ic ->
            boundCharacteristics?.let { chars -> return ic to chars }
        }

        // Configure ImageCapture with RAW_SENSOR + a Camera2Interop
        // capture callback for TotalCaptureResult. Both have to be on
        // the builder before build() is called.
        val builder = ImageCapture.Builder().setBufferFormat(ImageFormat.RAW_SENSOR)
        Camera2Interop.Extender(builder)
            .setSessionCaptureCallback(
                object : CameraCaptureSession.CaptureCallback() {
                    override fun onCaptureCompleted(
                        session: CameraCaptureSession,
                        request: CaptureRequest,
                        result: TotalCaptureResult,
                    ) {
                        // Only complete the deferred that was waiting when
                        // this capture was triggered. Stray callbacks (auto-
                        // exposure convergence, etc.) that arrive with no
                        // pending capture are ignored.
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

        // Bind a Preview use case alongside ImageCapture even when we have
        // no view to render into. On many Android devices ImageCapture
        // alone leaves the camera closed (Camera2 needs at least one
        // repeating request to keep the session live for a still capture)
        // — Pixel 6a hits this and takePicture throws "Not bound to a
        // valid Camera". Signalling willNotProvideSurface() releases the
        // request cleanly so no rendering happens; the repeating request
        // still keeps the camera open. Phase 7.2 will replace this stub
        // with a real view-supplied SurfaceProvider.
        val preview = Preview.Builder().build()
        preview.setSurfaceProvider { request: SurfaceRequest ->
            request.willNotProvideSurface()
        }

        val selector = CameraSelector.DEFAULT_BACK_CAMERA

        // CameraX bindToLifecycle must run on main thread. Same for later
        // takePicture calls — they schedule on the CameraX executor
        // internally, but the bind step touches main-thread-only state.
        val camera =
            withContext(Dispatchers.Main) {
                provider.bindToLifecycle(
                    ProcessLifecycleOwner.get(),
                    selector,
                    preview,
                    imageCapture,
                )
            }
        val cameraInfo = Camera2CameraInfo.from(camera.cameraInfo)
        val characteristics = fetchCharacteristics(cameraInfo)

        // Verify the camera actually supports RAW output — throw a
        // useful error here rather than deep in DngCreator later.
        val capabilities =
            characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                ?: IntArray(0)
        if (
            !capabilities.contains(
                CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW
            )
        ) {
            provider.unbind(imageCapture)
            throw UnsupportedOperationException(
                "Back camera does not advertise REQUEST_AVAILABLE_CAPABILITIES_RAW " +
                    "— device likely can't produce DNGs"
            )
        }

        Log.i(TAG, "Camera bound; RAW capable; camera=${cameraInfo.cameraId}")
        boundCamera = camera
        boundImageCapture = imageCapture
        boundCharacteristics = characteristics
        return imageCapture to characteristics
    }

    // Kotlin bridge: Camera2CameraInfo lacks a Kotlin-idiomatic accessor
    // for characteristics, so poke at the underlying Camera2 API through
    // its documented interop path.
    private fun fetchCharacteristics(
        camera2Info: Camera2CameraInfo
    ): CameraCharacteristics {
        // Camera2CameraInfo lets us read individual characteristics via
        // getCameraCharacteristic(key), but DngCreator wants the whole
        // CameraCharacteristics object. Reach through the CameraManager.
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
            // Orientation embedded in the DNG's Orientation EXIF tag. Use
            // the sensor orientation from characteristics as a rough
            // baseline — the JS side already handles orientation mismatch
            // between preview and sensor space in RawColorAnalysisScreen.
            val sensorOrientation =
                characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
            creator.setOrientation(exifOrientationForRotation(sensorOrientation))
            FileOutputStream(tempFile).use { stream ->
                creator.writeImage(stream, underlyingImage)
            }
        }
        Log.i(
            TAG,
            "DNG written: path=${tempFile.absolutePath} " +
                "size=${tempFile.length()} width=${image.width} height=${image.height}"
        )
        return CapturedPhoto(
            dngPath = "file://${tempFile.absolutePath}",
            width = image.width.toDouble(),
            height = image.height.toDouble(),
        )
    }

    // EXIF Orientation tag values (1..8) as defined by TIFF/EP.
    private fun exifOrientationForRotation(degrees: Int): Int =
        when ((degrees % 360 + 360) % 360) {
            0 -> android.media.ExifInterface.ORIENTATION_NORMAL
            90 -> android.media.ExifInterface.ORIENTATION_ROTATE_90
            180 -> android.media.ExifInterface.ORIENTATION_ROTATE_180
            270 -> android.media.ExifInterface.ORIENTATION_ROTATE_270
            else -> android.media.ExifInterface.ORIENTATION_NORMAL
        }

    // Not part of the Nitro spec — internal for future teardown if we
    // ever want to release the camera explicitly. Currently the session
    // outlives the app process.
    @Suppress("unused")
    private fun release() {
        val ic = boundImageCapture
        if (ic != null) {
            UiThreadUtil.runOnUiThread { provider.unbind(ic) }
        }
        boundCamera = null
        boundImageCapture = null
        boundCharacteristics = null
    }
}
