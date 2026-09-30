package com.margelo.nitro.rawcameraandroid

import android.content.Context
import android.os.SystemClock
import android.util.AttributeSet
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import androidx.lifecycle.Observer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Fabric-facing native view for the RAW camera preview. Wraps CameraX's
// PreviewView (which is `final` so we can't extend it) in a FrameLayout.
// On window attach the child PreviewView's SurfaceProvider is handed to
// the shared CameraSessionManager so any concurrent capture uses the
// same session (with Preview instead of the headless ImageAnalysis
// keep-alive). On detach it removes it.
class RawCameraAndroidView
@JvmOverloads
constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {
    private val previewView: PreviewView =
        PreviewView(context).apply {
            layoutParams =
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            scaleType = PreviewView.ScaleType.FILL_CENTER
            // Use TextureView (COMPATIBLE) instead of the default
            // SurfaceView (PERFORMANCE). SurfaceView needs the primary
            // Window's compositor, which isn't available when we render
            // inside an RN Modal (Modal uses a separate Android Dialog
            // window) — the surface is requested by CameraX but never
            // actually renders pixels, the camera stream never starts,
            // and takePicture hangs waiting on AF/AE.
            //
            // The trade-off is minor: TextureView is a bit heavier per
            // frame (composited by the GPU as a texture instead of via
            // a dedicated surface plane) but is Dialog/Modal-safe.
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }

    // Phase-8 overlay drawn on top of the preview. Reads per-ROI
    // colour codes from atomic ints — phase 8.0 leaves them at the
    // default "unknown / grey", phase 8.2 will wire actual analysis
    // results. Public so external code (session manager) can flip
    // codes without going through this class.
    val overlay: RoiOverlayView =
        RoiOverlayView(context).apply {
            layoutParams =
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
        }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var currentJob: Job? = null
    private var watchdogJob: Job? = null

    // Diagnostic listener for the black-preview race: PreviewView exposes
    // a StreamState LiveData that transitions IDLE → STREAMING once the
    // producer starts pushing frames. When "3-4 retries usually works,"
    // logging the state timeline of both a good and a bad attach makes
    // it possible to spot which stage stalls (surface never requested,
    // requested but never accepted, accepted but frames never arrive).
    // The watchdog below turns those observations into a self-heal:
    // if STREAMING never arrives within WATCHDOG_MS, kick a rebind.
    private var attachStartMs: Long = 0
    private var lastStreamState: PreviewView.StreamState =
        PreviewView.StreamState.IDLE
    private val streamStateObserver = Observer<PreviewView.StreamState> { s ->
        val dtMs = SystemClock.elapsedRealtime() - attachStartMs
        Log.i(TAG, "previewStreamState → $s (+${dtMs}ms since attach)")
        lastStreamState = s
    }

    // Time to wait for the preview to reach STREAMING before assuming
    // we hit the black-preview race and forcing a rebind. Tuned high
    // enough that a healthy attach (which typically transitions within
    // 300–500 ms) never trips it, but low enough that the user isn't
    // staring at a black frame forever. See "black-preview" note.
    private val WATCHDOG_MS = 2500L
    private val WATCHDOG_REBIND_MAX = 2

    init {
        addView(previewView)
        addView(overlay) // draw order: overlay after preview → drawn on top
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        attachStartMs = SystemClock.elapsedRealtime()
        Log.i(
            TAG,
            "onAttachedToWindow: view size=${width}x${height} " +
                "surfaceProvider=${previewView.surfaceProvider}",
        )
        // Observe the preview stream state transitions from IDLE (waiting
        // for the producer) to STREAMING (frames arriving). Registered
        // observeForever because this view has no LifecycleOwner.
        previewView.previewStreamState.observeForever(streamStateObserver)
        currentJob?.cancel()
        watchdogJob?.cancel()
        currentJob =
            scope.launch {
                attachAndArmWatchdog(rebindAttemptsLeft = WATCHDOG_REBIND_MAX)
            }
        // Subscribe the phase-8 overlay to per-frame analysis results.
        // The listener fires on the analysisExecutor background thread;
        // AtomicInteger writes are safe from any thread and
        // postInvalidate() hops to the UI thread for the redraw.
        CameraSessionManager.setFrameColorListener { refCode, sampleCode ->
            overlay.refColorCode.set(refCode)
            overlay.sampleColorCode.set(sampleCode)
            overlay.postInvalidate()
        }
    }

    // Attaches the current PreviewView's SurfaceProvider to the shared
    // session, then arms a watchdog: if StreamState hasn't gone to
    // STREAMING within WATCHDOG_MS, log a warning and force one more
    // rebind cycle. Bounded retry so a truly broken camera doesn't
    // spin forever. Root cause of the race isn't nailed down — likely
    // a stale SurfaceProvider held by the previous view during
    // React-Native mount/unmount cycles — but a bounce reliably
    // recovers when it happens.
    private suspend fun attachAndArmWatchdog(rebindAttemptsLeft: Int) {
        val t0 = SystemClock.elapsedRealtime()
        Log.i(
            TAG,
            "attach: attaching surface provider (+0ms), retriesLeft=$rebindAttemptsLeft",
        )
        CameraSessionManager.attachSurfaceProvider(previewView.surfaceProvider)
        Log.i(
            TAG,
            "attach: complete (+${SystemClock.elapsedRealtime() - t0}ms)",
        )
        // Watchdog runs in a separate coroutine so the current job can
        // complete cleanly. Cancels itself early via the observer if
        // STREAMING arrives.
        watchdogJob?.cancel()
        watchdogJob =
            scope.launch {
                delay(WATCHDOG_MS)
                if (lastStreamState == PreviewView.StreamState.STREAMING) {
                    Log.i(
                        TAG,
                        "watchdog: STREAMING reached before deadline, no action",
                    )
                    return@launch
                }
                if (rebindAttemptsLeft <= 0) {
                    Log.w(
                        TAG,
                        "watchdog: stayed ${lastStreamState} for ${WATCHDOG_MS}ms " +
                            "and no rebind attempts left — giving up",
                    )
                    return@launch
                }
                Log.w(
                    TAG,
                    "watchdog: preview stayed ${lastStreamState} for " +
                        "${WATCHDOG_MS}ms, forcing rebind " +
                        "(${rebindAttemptsLeft - 1} retries left after this)",
                )
                // Detach + reattach — session manager rebuilds the
                // whole CameraX binding, which usually breaks a stuck
                // preview surface loose. Recursive with a decremented
                // retry count.
                CameraSessionManager.detachSurfaceProvider()
                attachStartMs = SystemClock.elapsedRealtime()
                attachAndArmWatchdog(rebindAttemptsLeft - 1)
            }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.i(TAG, "onSizeChanged: ${w}x${h} (from ${oldw}x${oldh})")
    }

    override fun onDetachedFromWindow() {
        previewView.previewStreamState.removeObserver(streamStateObserver)
        CameraSessionManager.setFrameColorListener(null)
        currentJob?.cancel()
        watchdogJob?.cancel()
        currentJob =
            scope.launch {
                Log.i(TAG, "onDetachedFromWindow: detaching surface provider")
                CameraSessionManager.detachSurfaceProvider()
            }
        super.onDetachedFromWindow()
    }

    fun destroy() {
        scope.cancel()
    }

    // Called by the ViewManager @ReactProp("previewFitCenter") setter.
    fun setPreviewScaleType(scaleType: PreviewView.ScaleType) {
        previewView.scaleType = scaleType
    }

    // JS-driven ROI position setters. Update both the visual overlay
    // (native RoiOverlayView, which draws the two rects and colours
    // their outlines per-frame) AND the analyser (CameraSessionManager,
    // which samples the Y-plane inside those rects for variance). Both
    // rects come from the same fractional coords so they stay in sync
    // — otherwise the coloured outline would show the wrong region's
    // consistency.
    fun setRefRoi(x: Float, y: Float, w: Float, h: Float) {
        overlay.setRefRoi(x, y, w, h)
        CameraSessionManager.setAnalyzerRefRoi(x, y, w, h)
    }

    fun setSampleRoi(x: Float, y: Float, w: Float, h: Float) {
        overlay.setSampleRoi(x, y, w, h)
        CameraSessionManager.setAnalyzerSampleRoi(x, y, w, h)
    }

    // Prop forwarder for the preferJpeg view manager prop. Applied
    // BEFORE onAttachedToWindow's bind so the ensureBoundLocked
    // fallback ordering sees the caller's preference. See
    // CameraSessionManager.setPreferJpegOverAnalysis for semantics.
    fun setPreferJpegOverAnalysis(prefer: Boolean) {
        CameraSessionManager.setPreferJpegOverAnalysis(prefer)
    }

    companion object {
        private const val TAG = "RawCameraAndroid.View"
    }
}
