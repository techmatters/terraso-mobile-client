package com.margelo.nitro.rawcameraandroid

import android.Manifest
import android.content.ContentUris
import android.content.ContentValues
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
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.util.Rational
import android.view.Surface
import androidx.annotation.OptIn as AndroidXOptIn
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.CaptureRequestOptions
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
import com.google.common.util.concurrent.ListenableFuture
import com.margelo.nitro.NitroModules
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
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
    // Camera-state overrides (exposure comp, manual sensor settings,
    // AE/AWB locks) return a ListenableFuture that COMPLETES when the
    // options land in the current CameraCaptureSession. When the HAL
    // silently rejects an option (typical: SENSOR_EXPOSURE_TIME >
    // SENSOR_FRAME_DURATION so the request breaks preview), the future
    // never fires and we'd deadlock the capture path. Time out and
    // proceed with whatever state the camera actually converged to.
    private const val APPLY_OPTIONS_TIMEOUT_MS = 3_000L

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
    //
    // `options` may set AE compensation index and/or a manual (ISO,
    // shutter) override. Both are applied to the camera-control state
    // before the capture is triggered. State is reset after each capture
    // so the next call starts from a known baseline — see resetCameraStateLocked.
    suspend fun capture(options: CaptureOptions): CapturedPhoto =
        mutex.withLock {
            captureLocked(
                options,
                burstStamp = null,
                burstIdx = 0,
                burstTotal = 0,
                sessionSubdir = null,
            )
        }

    // Capture N frames in rapid succession with AE + AWB locked so all
    // frames share identical sensor state. If `options` sets manual
    // (ISO, shutter), locking is redundant (AE is off already) but the
    // manual override is applied once before the burst rather than per
    // frame. All frames share a burst timestamp and get frame-index
    // suffixes in their filenames.
    suspend fun captureBurst(
        count: Int,
        options: CaptureOptions,
    ): Array<CapturedPhoto> =
        mutex.withLock {
            require(count in 1..20) { "captureBurst: count must be 1..20, got $count" }
            val burstStamp = timestampNowCompact()
            val results = ArrayList<CapturedPhoto>(count)
            try {
                for (i in 1..count) {
                    Log.i(TAG, "captureBurst: frame $i/$count")
                    results.add(
                        captureLocked(
                            options,
                            burstStamp = burstStamp,
                            burstIdx = i,
                            burstTotal = count,
                            sessionSubdir = null,
                        )
                    )
                }
            } finally {
                // captureLocked resets between frames anyway, but be
                // explicit in case the loop threw partway.
                resetCameraStateLocked()
            }
            results.toTypedArray()
        }

    // Research data-collection shutter: fires the burst then the
    // manual sweep in one shot-of-the-user's-time. All files land in
    // MediaStore.Downloads/soilcap/session_<ts>/ so `adb pull` grabs
    // the whole session in one go. See docs/munsell-multishot.md.
    //
    // Filename format:
    //   burst<i>of<N>_auto.dng      (auto-AE burst frames)
    //   burst<i>of<N>_auto.jpg
    //   manual_iso<n>_shut<X>ms.dng (manual sweep, one per iso/shutter combo)
    //   manual_iso<n>_shut<X>ms.jpg
    suspend fun captureSession(
        request: CaptureSessionRequest,
    ): Array<CapturedPhoto> =
        mutex.withLock {
            val burstCount = request.burstCount.toInt()
            val manualShots = request.manualShots
            require(burstCount in 0..20) { "captureSession: burstCount must be 0..20, got $burstCount" }
            require(manualShots.size <= 20) { "captureSession: too many manual shots (max 20)" }
            require(burstCount > 0 || manualShots.isNotEmpty()) {
                "captureSession: nothing to shoot"
            }
            val sessionStamp = timestampNowCompact()
            val sessionSubdir = "session_$sessionStamp"
            Log.i(
                TAG,
                "captureSession: starting subdir=$sessionSubdir burst=$burstCount manual=${manualShots.size}",
            )
            val results = ArrayList<CapturedPhoto>(burstCount + manualShots.size)
            try {
                // Auto-AE burst first.
                for (i in 1..burstCount) {
                    Log.i(TAG, "captureSession: burst frame $i/$burstCount")
                    results.add(
                        captureLocked(
                            options = CaptureOptions(null, null, null),
                            burstStamp = sessionStamp,
                            burstIdx = i,
                            burstTotal = burstCount,
                            sessionSubdir = sessionSubdir,
                        )
                    )
                }
                // Manual sweep. Each entry gets its own timestamp within
                // the session dir so filenames are unique + human-sortable.
                for ((mIdx, shot) in manualShots.withIndex()) {
                    Log.i(
                        TAG,
                        "captureSession: manual ${mIdx + 1}/${manualShots.size} " +
                            "iso=${shot.sensorSensitivity?.toInt()} " +
                            "shutterNs=${shot.sensorExposureTimeNs?.toLong()}",
                    )
                    val opts = CaptureOptions(
                        aeCompensation = null,
                        sensorExposureTimeNs = shot.sensorExposureTimeNs,
                        sensorSensitivity = shot.sensorSensitivity,
                    )
                    results.add(
                        captureLocked(
                            options = opts,
                            burstStamp = sessionStamp,
                            burstIdx = 0, // 0 = not a burst frame; distinguishes manual shots
                            burstTotal = 0,
                            sessionSubdir = sessionSubdir,
                        )
                    )
                }
            } finally {
                resetCameraStateLocked()
            }
            Log.i(TAG, "captureSession: complete, ${results.size} shots in $sessionSubdir")
            results.toTypedArray()
        }

    // Fetch the currently-bound back camera's exposure-control ranges.
    // Binds the session if needed (so a UI that just mounted can query
    // this before the user has ever pressed shutter).
    suspend fun getCapabilities(): CaptureCapabilities =
        mutex.withLock {
            requireCameraPermission()
            val (_, _, characteristics) = ensureBoundLocked()
            val evRange = characteristics.get(
                CameraCharacteristics.CONTROL_AE_COMPENSATION_RANGE
            ) ?: android.util.Range(0, 0)
            val evStep = characteristics.get(
                CameraCharacteristics.CONTROL_AE_COMPENSATION_STEP
            ) ?: Rational(0, 1)
            val expRange = characteristics.get(
                CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE
            ) ?: android.util.Range(0L, 0L)
            val isoRange = characteristics.get(
                CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE
            ) ?: android.util.Range(0, 0)
            CaptureCapabilities(
                aeCompensationMin = evRange.lower.toDouble(),
                aeCompensationMax = evRange.upper.toDouble(),
                aeCompensationStepNum = evStep.numerator.toDouble(),
                aeCompensationStepDen = evStep.denominator.toDouble(),
                sensorExposureTimeMinNs = expRange.lower.toDouble(),
                sensorExposureTimeMaxNs = expRange.upper.toDouble(),
                sensorSensitivityMin = isoRange.lower.toDouble(),
                sensorSensitivityMax = isoRange.upper.toDouble(),
            )
        }

    // Shared capture body used by capture() and captureBurst(). Assumes
    // the mutex is held. When burstStamp is null the shot is a single
    // (non-burst) capture; when non-null, all frames in a burst share
    // the same timestamp string and burstIdx/burstTotal drive the
    // filename suffix.
    private suspend fun captureLocked(
        options: CaptureOptions,
        burstStamp: String?,
        burstIdx: Int,
        burstTotal: Int,
        sessionSubdir: String?,
    ): CapturedPhoto {
        Log.i(
            TAG,
            "captureLocked: entered opts=$options burst=$burstIdx/$burstTotal session=$sessionSubdir",
        )
        requireCameraPermission()
        val (imageCapture, jpegCapture, characteristics) = ensureBoundLocked()

        val evStep = characteristics.get(
            CameraCharacteristics.CONTROL_AE_COMPENSATION_STEP
        ) ?: Rational(1, 1)
        val effectiveOptions = clampOptions(options, characteristics)
        val stamp = burstStamp ?: timestampNowCompact()
        val stem =
            if (sessionSubdir != null) {
                buildSessionShotStem(
                    options = effectiveOptions,
                    burstIdx = burstIdx,
                    burstTotal = burstTotal,
                )
            } else {
                buildFileStem(
                    stamp = stamp,
                    options = effectiveOptions,
                    evStepNum = evStep.numerator,
                    evStepDen = evStep.denominator,
                    burstIdx = burstIdx,
                    burstTotal = burstTotal,
                )
            }

        applyCaptureOptionsLocked(effectiveOptions, lockAeAwbForBurst = burstTotal > 1)

        val resultDeferred = CompletableDeferred<TotalCaptureResult>()
        pendingResult = resultDeferred
        Log.i(TAG, "captureLocked: triggering takePicture (raw + jpeg)…")

        // Two output paths depending on whether we're in session mode:
        //   sessionSubdir=null → cacheDir (single-shot / plain burst path,
        //     for the built-in analyzer + share-sheet flow)
        //   sessionSubdir!=null → MediaStore.Downloads/soilcap/$sessionSubdir/
        //     (research data-collection path, visible to Files/Drive apps
        //     and accessible via `adb pull /sdcard/Download/soilcap/…`)
        val useMediaStore = sessionSubdir != null
        val jpegOptions: ImageCapture.OutputFileOptions
        val jpegDisplayPath: String
        val jpegCleanup: () -> Unit
        if (useMediaStore) {
            val opened = openJpegMediaStoreOutput(sessionSubdir!!, stem)
            jpegOptions = opened.options
            jpegDisplayPath = opened.displayPath
            jpegCleanup = { deleteMediaStoreUri(opened.uri) }
        } else {
            val jpegFile = File(context.cacheDir, "$stem.jpg")
            jpegOptions = ImageCapture.OutputFileOptions.Builder(jpegFile).build()
            jpegDisplayPath = "file://${jpegFile.absolutePath}"
            jpegCleanup = { jpegFile.delete() }
        }
        val executor = ContextCompat.getMainExecutor(context)

        try {
            return coroutineScope {
                val rawJob = async(Dispatchers.Main) {
                    takePictureSuspending(imageCapture)
                }
                val jpegJob = async(Dispatchers.Main) {
                    takePictureWithOptionsSuspending(jpegCapture, jpegOptions, executor)
                }

                val image: ImageProxy =
                    try {
                        withTimeout(TAKE_PICTURE_TIMEOUT_MS) { rawJob.await() }
                    } catch (e: Throwable) {
                        pendingResult = null
                        jpegJob.cancel()
                        jpegCleanup()
                        Log.e(TAG, "captureLocked: RAW takePicture failed", e)
                        throw RuntimeException(
                            "takePicture failed (or timed out after ${TAKE_PICTURE_TIMEOUT_MS}ms)",
                            e,
                        )
                    }
                Log.i(
                    TAG,
                    "captureLocked: takePicture returned image ${image.width}x${image.height}"
                )

                val totalResult: TotalCaptureResult =
                    try {
                        withTimeout(CAPTURE_RESULT_TIMEOUT_MS) { resultDeferred.await() }
                    } catch (e: Throwable) {
                        image.close()
                        jpegJob.cancel()
                        jpegCleanup()
                        throw RuntimeException(
                            "Timed out waiting for TotalCaptureResult (${CAPTURE_RESULT_TIMEOUT_MS}ms)",
                            e,
                        )
                    } finally {
                        pendingResult = null
                    }

                val jpegPath: String? =
                    try {
                        withTimeout(TAKE_PICTURE_TIMEOUT_MS) { jpegJob.await() }
                        Log.i(TAG, "captureLocked: JPEG written to $jpegDisplayPath")
                        jpegDisplayPath
                    } catch (e: Throwable) {
                        Log.w(
                            TAG,
                            "captureLocked: JPEG capture failed (continuing with RAW only)",
                            e,
                        )
                        jpegCleanup()
                        null
                    }

                val result =
                    if (useMediaStore) {
                        writeDngMediaStore(image, characteristics, totalResult, sessionSubdir!!, stem, jpegPath)
                    } else {
                        val dngFile = File(context.cacheDir, "$stem.dng")
                        writeDngFile(image, characteristics, totalResult, dngFile, jpegPath)
                    }
                image.close()
                result
            }
        } finally {
            // For a single capture, reset overrides so the next call
            // starts clean. For a burst, only reset at the end of the
            // sequence (last frame OR captureBurst catch-all).
            if (burstTotal <= 1 || burstIdx == burstTotal) {
                resetCameraStateLocked()
                // In blind mode (no attached view) release the session so
                // libgcam doesn't spam metering-error logs on every frame.
                if (currentSurfaceProvider == null) {
                    Log.i(TAG, "captureLocked: no attached view, releasing session")
                    unbindAllLocked()
                }
            }
        }
    }

    // Applies AE compensation + optional manual (ISO, shutter) via
    // CameraX CameraControl + Camera2Interop. Waits (with a bounded
    // timeout) for the futures so the next takePicture actually
    // reflects the new state. On timeout we log and proceed rather
    // than hang — a hung applyCaptureOptions is worse than a shot
    // taken with slightly stale AE.
    private suspend fun applyCaptureOptionsLocked(
        options: CaptureOptions,
        lockAeAwbForBurst: Boolean,
    ) {
        val camera = boundCamera ?: return
        val cc = camera.cameraControl
        val c2cc = Camera2CameraControl.from(cc)

        val evIndex = options.aeCompensation?.toInt() ?: 0
        Log.i(TAG, "applyCaptureOptions: setting AE comp index=$evIndex")
        awaitFutureWithTimeout("setExposureCompensationIndex($evIndex)") {
            cc.setExposureCompensationIndex(evIndex)
        }

        val builder = CaptureRequestOptions.Builder()
        val manualShutter = options.sensorExposureTimeNs
        val manualIso = options.sensorSensitivity
        val hasManual = manualShutter != null && manualIso != null
        if (hasManual) {
            // SENSOR_FRAME_DURATION MUST be >= SENSOR_EXPOSURE_TIME
            // per the Camera2 HAL contract; otherwise the HAL silently
            // rejects the whole options bundle and setCaptureRequestOptions'
            // future never completes. Match them exactly so preview
            // slows down as needed to fit the exposure — the fps ceiling
            // is a soft target, not a hard one.
            val shutterNs = manualShutter!!.toLong()
            val frameDurationNs = shutterNs
            Log.i(
                TAG,
                "applyCaptureOptions: manual iso=${manualIso!!.toInt()} " +
                    "shutterNs=$shutterNs frameDurationNs=$frameDurationNs",
            )
            builder
                .setCaptureRequestOption(
                    CaptureRequest.CONTROL_AE_MODE,
                    CameraMetadata.CONTROL_AE_MODE_OFF,
                )
                .setCaptureRequestOption(
                    CaptureRequest.SENSOR_EXPOSURE_TIME,
                    shutterNs,
                )
                .setCaptureRequestOption(
                    CaptureRequest.SENSOR_SENSITIVITY,
                    manualIso.toInt(),
                )
                .setCaptureRequestOption(
                    CaptureRequest.SENSOR_FRAME_DURATION,
                    frameDurationNs,
                )
        } else if (lockAeAwbForBurst) {
            // Auto-exposure burst: lock so each frame in the sequence
            // sees identical sensor settings. Meaningless if manual is
            // on (AE off already).
            Log.i(TAG, "applyCaptureOptions: locking AE + AWB for burst")
            builder
                .setCaptureRequestOption(CaptureRequest.CONTROL_AE_LOCK, true)
                .setCaptureRequestOption(CaptureRequest.CONTROL_AWB_LOCK, true)
        }
        awaitFutureWithTimeout("setCaptureRequestOptions") {
            c2cc.setCaptureRequestOptions(builder.build())
        }
    }

    // Undo everything applyCaptureOptionsLocked did — restore AE mode,
    // zero EV, drop AE/AWB locks. Runs after every terminal capture so
    // the next call starts clean and doesn't inherit stale manual
    // settings that could crush or blow out an unrelated shot.
    private suspend fun resetCameraStateLocked() {
        val camera = boundCamera ?: return
        val cc = camera.cameraControl
        val c2cc = Camera2CameraControl.from(cc)
        awaitFutureWithTimeout("reset:setExposureCompensationIndex(0)") {
            cc.setExposureCompensationIndex(0)
        }
        awaitFutureWithTimeout("reset:clearCaptureRequestOptions") {
            c2cc.clearCaptureRequestOptions()
        }
    }

    // Wraps awaitFuture with a bounded timeout + catch, so any single
    // camera-state adjustment that hangs (HAL rejects request → future
    // never fires) or throws doesn't deadlock the capture path. We
    // always proceed — a shot taken with slightly stale state is
    // better than a totally frozen UI.
    private suspend fun <T> awaitFutureWithTimeout(
        label: String,
        producer: () -> ListenableFuture<T>,
    ) {
        try {
            withTimeout(APPLY_OPTIONS_TIMEOUT_MS) { awaitFuture(producer()) }
        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
            Log.w(TAG, "applyCaptureOptions: $label timed out — proceeding")
        } catch (e: Throwable) {
            Log.w(TAG, "applyCaptureOptions: $label failed — proceeding", e)
        }
    }

    // Clamp options against the current camera characteristics so we
    // never hand the HAL a value outside its advertised range. Returns
    // a new CaptureOptions with clamped values (or nulls preserved).
    private fun clampOptions(
        options: CaptureOptions,
        characteristics: CameraCharacteristics,
    ): CaptureOptions {
        val evRange = characteristics.get(
            CameraCharacteristics.CONTROL_AE_COMPENSATION_RANGE
        )
        val evClamped = options.aeCompensation?.let { raw ->
            if (evRange != null) {
                raw.toInt().coerceIn(evRange.lower, evRange.upper).toDouble()
            } else raw
        }
        val expRange = characteristics.get(
            CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE
        )
        val shutterClamped = options.sensorExposureTimeNs?.let { raw ->
            if (expRange != null) {
                raw.toLong().coerceIn(expRange.lower, expRange.upper).toDouble()
            } else raw
        }
        val isoRange = characteristics.get(
            CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE
        )
        val isoClamped = options.sensorSensitivity?.let { raw ->
            if (isoRange != null) {
                raw.toInt().coerceIn(isoRange.lower, isoRange.upper).toDouble()
            } else raw
        }
        return CaptureOptions(
            aeCompensation = evClamped,
            sensorExposureTimeNs = shutterClamped,
            sensorSensitivity = isoClamped,
        )
    }

    private suspend fun <T> awaitFuture(future: ListenableFuture<T>): T =
        suspendCancellableCoroutine { cont ->
            val exec = ContextCompat.getMainExecutor(context)
            future.addListener(
                {
                    try {
                        cont.resume(future.get())
                    } catch (e: Throwable) {
                        cont.resumeWithException(e)
                    }
                },
                exec,
            )
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
    // CameraX writes the encoded JPEG to disk (or to a MediaStore Uri
    // opened via ContentResolver) itself, no ImageProxy decode +
    // re-encode round-trip. Resumes once the file / stream is closed.
    private suspend fun takePictureWithOptionsSuspending(
        imageCapture: ImageCapture,
        outputFileOptions: ImageCapture.OutputFileOptions,
        executor: java.util.concurrent.Executor,
    ): Unit =
        suspendCancellableCoroutine { cont ->
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

    private fun writeDngFile(
        image: ImageProxy,
        characteristics: CameraCharacteristics,
        result: TotalCaptureResult,
        outFile: File,
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
        DngCreator(characteristics, result).use { creator ->
            val sensorOrientation =
                characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
            creator.setOrientation(exifOrientationForRotation(sensorOrientation))
            FileOutputStream(outFile).use { stream ->
                creator.writeImage(stream, underlyingImage)
            }
        }
        Log.i(
            TAG,
            "DNG written: path=${outFile.absolutePath} size=${outFile.length()} " +
                "width=${image.width} height=${image.height}"
        )
        return CapturedPhoto(
            dngPath = "file://${outFile.absolutePath}",
            jpegPath = jpegPath,
            width = image.width.toDouble(),
            height = image.height.toDouble(),
        )
    }

    // ------------------------------------------------------------------
    // MediaStore session output (research data-collection path)
    // ------------------------------------------------------------------

    // Base subdirectory under the phone's public Downloads folder where
    // every research-data-collection session lands. Chosen so the shared
    // location is discoverable via Files / Drive apps and pullable via
    // `adb pull /sdcard/Download/soilcap` in one shot.
    private const val SOILCAP_ROOT = "Download/soilcap"

    private data class MediaStoreJpegOutput(
        val options: ImageCapture.OutputFileOptions,
        val uri: Uri,
        val displayPath: String,
    )

    // Insert a MediaStore.Downloads row for a JPEG under $SOILCAP_ROOT/
    // <sessionSubdir>/, get back a Uri + OutputFileOptions the JPEG
    // ImageCapture can write to directly. displayPath is the sdcard
    // path the file will end up at, for logs + the JS-side result.
    private fun openJpegMediaStoreOutput(
        sessionSubdir: String,
        stem: String,
    ): MediaStoreJpegOutput {
        val displayName = "$stem.jpg"
        val relativePath = "$SOILCAP_ROOT/$sessionSubdir"
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }
        val collection = downloadsCollection()
        val options = ImageCapture.OutputFileOptions.Builder(
            context.contentResolver, collection, values,
        ).build()
        // The Uri from OutputFileOptions isn't exposed; CameraX inserts
        // its own row when it saves. We insert an extra placeholder here
        // just for tracking + cleanup on error. Actually CameraX'
        // OutputFileOptions.Builder(contentResolver, collection, values)
        // handles insertion internally and returns the row Uri in
        // OnImageSavedCallback. So we can't clean up on cancellation
        // without waiting for the callback. Best-effort: rely on the
        // catch in captureLocked to have already fired.
        val displayPath = "/sdcard/$relativePath/$displayName"
        return MediaStoreJpegOutput(options, Uri.EMPTY, displayPath)
    }

    // Delete a MediaStore row by Uri. Best-effort — swallow errors.
    // Uri.EMPTY is a no-op (we don't always have a concrete Uri).
    private fun deleteMediaStoreUri(uri: Uri) {
        if (uri == Uri.EMPTY) return
        try {
            context.contentResolver.delete(uri, null, null)
        } catch (e: Throwable) {
            Log.w(TAG, "deleteMediaStoreUri: failed for $uri", e)
        }
    }

    // Insert a MediaStore.Downloads row for a DNG, write the DNG bytes
    // via DngCreator into the ContentResolver's OutputStream, and
    // finalize the row (clear IS_PENDING) so other apps can see it.
    private fun writeDngMediaStore(
        image: ImageProxy,
        characteristics: CameraCharacteristics,
        result: TotalCaptureResult,
        sessionSubdir: String,
        stem: String,
        jpegPath: String?,
    ): CapturedPhoto {
        val underlyingImage =
            image.image
                ?: throw RuntimeException(
                    "ImageProxy has no underlying android.media.Image"
                )
        val displayName = "$stem.dng"
        val relativePath = "$SOILCAP_ROOT/$sessionSubdir"
        val cropRegion = result.get(CaptureResult.SCALER_CROP_REGION)
        Log.i(TAG, "CAPTURE result (mediastore): sensorCropRegion=$cropRegion")

        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, displayName)
            put(MediaStore.MediaColumns.MIME_TYPE, "image/x-adobe-dng")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(downloadsCollection(), values)
            ?: throw RuntimeException("MediaStore.insert returned null for $displayName")
        try {
            resolver.openOutputStream(uri, "w")?.use { stream ->
                DngCreator(characteristics, result).use { creator ->
                    val sensorOrientation =
                        characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
                    creator.setOrientation(exifOrientationForRotation(sensorOrientation))
                    creator.writeImage(stream, underlyingImage)
                }
            } ?: throw RuntimeException("openOutputStream returned null for $uri")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val finalize = ContentValues().apply {
                    put(MediaStore.MediaColumns.IS_PENDING, 0)
                }
                resolver.update(uri, finalize, null, null)
            }
        } catch (e: Throwable) {
            deleteMediaStoreUri(uri)
            throw e
        }
        val displayPath = "/sdcard/$relativePath/$displayName"
        Log.i(TAG, "DNG written (mediastore): path=$displayPath uri=$uri")
        return CapturedPhoto(
            dngPath = "file://$displayPath",
            jpegPath = jpegPath,
            width = image.width.toDouble(),
            height = image.height.toDouble(),
        )
    }

    // MediaStore.Downloads collection URI. Only available on API 29+
    // (the app's minSdk is 26). On older devices we fall back to legacy
    // external media collection — captureSession callers should still
    // see something usable, though the sdcard/Download/ path may not be
    // enforced.
    private fun downloadsCollection(): Uri =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Files.getContentUri("external")
        }

    // Compact timestamp for shared use across burst frames + filename
    // stems. Sortable, no colons/slashes/etc. that would need escaping
    // in a file path. Example: "20260817T143052-123".
    private fun timestampNowCompact(): String =
        SimpleDateFormat("yyyyMMdd'T'HHmmss-SSS", Locale.US).format(Date())

    // Build the filename stem (no extension) encoding this capture's
    // parameters so we can reconstruct the settings from the on-disk
    // filename during offline analysis. Example results:
    //   "RawCameraAndroid_20260817T143052-123_ev0"
    //   "RawCameraAndroid_20260817T143052-123_ev+1.5_burst3of5"
    //   "RawCameraAndroid_20260817T143052-123_ev0_iso100_shut67ms"
    private fun buildFileStem(
        stamp: String,
        options: CaptureOptions,
        evStepNum: Int,
        evStepDen: Int,
        burstIdx: Int,
        burstTotal: Int,
    ): String {
        val parts = mutableListOf("RawCameraAndroid", stamp)
        val evIndex = options.aeCompensation?.toInt() ?: 0
        parts.add("ev" + formatEv(evIndex, evStepNum, evStepDen))
        options.sensorSensitivity?.let { parts.add("iso${it.toInt()}") }
        options.sensorExposureTimeNs?.let { parts.add("shut${formatShutter(it.toLong())}") }
        if (burstTotal > 1) parts.add("burst${burstIdx}of${burstTotal}")
        return parts.joinToString("_")
    }

    // Session-mode stem — used when the file lands inside a
    // session_<ts>/ directory, so the timestamp + fixed "RawCameraAndroid"
    // prefix are redundant. Emits shorter, more legible names:
    //   burstIdx>0  → "burst<i>of<N>_auto"
    //   burstIdx==0 → "manual_iso<n>_shut<X>" (options must set both)
    //   otherwise   → "auto" (single-shot in session — rare)
    private fun buildSessionShotStem(
        options: CaptureOptions,
        burstIdx: Int,
        burstTotal: Int,
    ): String {
        if (burstTotal > 1) return "burst${burstIdx}of${burstTotal}_auto"
        val iso = options.sensorSensitivity?.toInt()
        val shutterNs = options.sensorExposureTimeNs?.toLong()
        if (iso != null && shutterNs != null) {
            return "manual_iso${iso}_shut${formatShutter(shutterNs)}"
        }
        return "auto"
    }

    // Format an AE compensation index as an EV string with sign, up to
    // two decimal places, trailing zeros dropped. Examples (step 1/3):
    //   idx  0 → "0"
    //   idx +1 → "+0.33"
    //   idx +3 → "+1"
    //   idx -3 → "-1"
    private fun formatEv(idx: Int, stepNum: Int, stepDen: Int): String {
        if (idx == 0) return "0"
        val evStops = idx.toDouble() * stepNum / stepDen
        val rounded = Math.round(evStops * 100.0) / 100.0
        val body =
            if (rounded == rounded.toLong().toDouble()) {
                rounded.toLong().toString()
            } else {
                "%.2f".format(Locale.US, rounded).trimEnd('0').trimEnd('.')
            }
        return if (rounded > 0) "+$body" else body
    }

    // Format a sensor exposure time (nanoseconds) as a compact
    // human-legible token. Rounds to the nearest useful unit so the
    // filename stays short. Examples: 1e9→"1s", 6.67e7→"67ms", 5e5→"500us".
    private fun formatShutter(ns: Long): String =
        when {
            ns >= 1_000_000_000L -> "${(ns + 500_000_000L) / 1_000_000_000L}s"
            ns >= 1_000_000L -> "${(ns + 500_000L) / 1_000_000L}ms"
            ns >= 1_000L -> "${(ns + 500L) / 1_000L}us"
            else -> "${ns}ns"
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
