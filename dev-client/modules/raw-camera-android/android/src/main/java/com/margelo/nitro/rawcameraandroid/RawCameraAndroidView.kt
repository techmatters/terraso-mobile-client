package com.margelo.nitro.rawcameraandroid

import android.content.Context
import android.util.AttributeSet
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
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

    init {
        addView(previewView)
        addView(overlay) // draw order: overlay after preview → drawn on top
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.i(TAG, "onAttachedToWindow: view size=${width}x${height}")
        currentJob?.cancel()
        currentJob =
            scope.launch {
                Log.i(TAG, "onAttachedToWindow: attaching surface provider")
                CameraSessionManager.attachSurfaceProvider(previewView.surfaceProvider)
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

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.i(TAG, "onSizeChanged: ${w}x${h} (from ${oldw}x${oldh})")
    }

    override fun onDetachedFromWindow() {
        CameraSessionManager.setFrameColorListener(null)
        currentJob?.cancel()
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

    companion object {
        private const val TAG = "RawCameraAndroid.View"
    }
}
