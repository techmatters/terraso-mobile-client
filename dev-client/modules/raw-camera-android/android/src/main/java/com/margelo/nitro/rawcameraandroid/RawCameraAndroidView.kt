package com.margelo.nitro.rawcameraandroid

import android.content.Context
import android.util.AttributeSet
import android.util.Log
import androidx.camera.view.PreviewView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

// Fabric-facing native view for the RAW camera preview. Extends
// CameraX's PreviewView, which handles the SurfaceView/TextureView
// gymnastics + orientation + aspect ratio. On window attach it hands
// its SurfaceProvider to the shared CameraSessionManager so any
// concurrent capture uses the same session (with Preview instead of
// the headless ImageAnalysis keep-alive). On detach it removes it.
class RawCameraAndroidView
@JvmOverloads
constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : PreviewView(context, attrs) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var currentJob: Job? = null

    init {
        // Default fit: preserve aspect, fill container. Callers can
        // override by setting scaleType from the JS side later.
        scaleType = ScaleType.FILL_CENTER
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        currentJob?.cancel()
        currentJob =
            scope.launch {
                Log.i(TAG, "onAttachedToWindow: attaching surface provider")
                CameraSessionManager.attachSurfaceProvider(surfaceProvider)
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
