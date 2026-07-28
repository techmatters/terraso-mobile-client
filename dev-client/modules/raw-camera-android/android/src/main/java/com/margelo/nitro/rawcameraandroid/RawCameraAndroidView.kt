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
        }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var currentJob: Job? = null

    init {
        addView(previewView)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        currentJob?.cancel()
        currentJob =
            scope.launch {
                Log.i(TAG, "onAttachedToWindow: attaching surface provider")
                CameraSessionManager.attachSurfaceProvider(previewView.surfaceProvider)
            }
    }

    override fun onDetachedFromWindow() {
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

    companion object {
        private const val TAG = "RawCameraAndroid.View"
    }
}
