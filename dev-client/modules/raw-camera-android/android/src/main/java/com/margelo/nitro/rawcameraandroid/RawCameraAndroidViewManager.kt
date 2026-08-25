package com.margelo.nitro.rawcameraandroid

import android.view.View
import androidx.camera.view.PreviewView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

// Classic RN ViewManager (still works on the new arch as a legacy
// path). Registered in RawCameraAndroidPackage.createViewManagers().
// JS side references this component via
// requireNativeComponent('RawCameraAndroidView').
class RawCameraAndroidViewManager : SimpleViewManager<RawCameraAndroidView>() {
    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): RawCameraAndroidView =
        RawCameraAndroidView(reactContext)

    override fun onDropViewInstance(view: RawCameraAndroidView) {
        view.destroy()
        super.onDropViewInstance(view)
    }

    // JS-controllable flag: when false, hide the built-in two-ROI
    // overlay (phase-8 real-time analyzer). Set false from the chart
    // validator flow so the Munsell chart-guide rectangle drawn by JS
    // isn't visually competing with the ROI squares. Defaults to true
    // for backwards-compat with the soil-colour capture path.
    @ReactProp(name = "showRoiOverlay", defaultBoolean = true)
    fun setShowRoiOverlay(view: RawCameraAndroidView, show: Boolean) {
        view.overlay.visibility = if (show) View.VISIBLE else View.GONE
    }

    // JS-controllable preview scale: FILL_CENTER (default) crops the
    // preview to fill the fullscreen native view — good for cinematic
    // soil-colour capture but breaks WYSIWYG for the chart validator
    // (on-screen guide would cover ~50% of what's actually captured).
    // FIT_CENTER letterboxes the 3:4 preview inside the tall view so
    // the sensor image is shown 1:1 with the DNG. Chart-guide flow
    // sets this true; the JS-side SensorAspectFrame around the chart
    // overlay lines up with the letterboxed preview.
    @ReactProp(name = "previewFitCenter", defaultBoolean = false)
    fun setPreviewFitCenter(view: RawCameraAndroidView, fit: Boolean) {
        view.setPreviewScaleType(
            if (fit) PreviewView.ScaleType.FIT_CENTER else PreviewView.ScaleType.FILL_CENTER,
        )
    }

    // Per-ROI display-space fractional coords. React applies props one
    // at a time (each @ReactProp is a separate call), so we accumulate
    // the four floats per rect in a small per-view state map and only
    // push to the view+analyser when all four have arrived at least
    // once. Subsequent changes to any one component push a fresh (x,
    // y, w, h) tuple. Defaults mirror RoiOverlayView's defaults so a
    // view without any of these props behaves the same as before.
    @ReactProp(name = "refRoiX", defaultFloat = 0.15f)
    fun setRefRoiX(view: RawCameraAndroidView, v: Float) { updateRoi(view, REF, 0, v) }
    @ReactProp(name = "refRoiY", defaultFloat = 0.10f)
    fun setRefRoiY(view: RawCameraAndroidView, v: Float) { updateRoi(view, REF, 1, v) }
    @ReactProp(name = "refRoiW", defaultFloat = 0.70f)
    fun setRefRoiW(view: RawCameraAndroidView, v: Float) { updateRoi(view, REF, 2, v) }
    @ReactProp(name = "refRoiH", defaultFloat = 0.30f)
    fun setRefRoiH(view: RawCameraAndroidView, v: Float) { updateRoi(view, REF, 3, v) }
    @ReactProp(name = "sampleRoiX", defaultFloat = 0.15f)
    fun setSampleRoiX(view: RawCameraAndroidView, v: Float) { updateRoi(view, SAMPLE, 0, v) }
    @ReactProp(name = "sampleRoiY", defaultFloat = 0.55f)
    fun setSampleRoiY(view: RawCameraAndroidView, v: Float) { updateRoi(view, SAMPLE, 1, v) }
    @ReactProp(name = "sampleRoiW", defaultFloat = 0.70f)
    fun setSampleRoiW(view: RawCameraAndroidView, v: Float) { updateRoi(view, SAMPLE, 2, v) }
    @ReactProp(name = "sampleRoiH", defaultFloat = 0.30f)
    fun setSampleRoiH(view: RawCameraAndroidView, v: Float) { updateRoi(view, SAMPLE, 3, v) }

    // Per-view accumulator: view instance → [refXYWH, sampleXYWH].
    // WeakHashMap so a destroyed view doesn't leak. Every prop write
    // updates one slot and re-pushes the current tuple.
    private val roiState = java.util.WeakHashMap<RawCameraAndroidView, Array<FloatArray>>()

    private fun updateRoi(
        view: RawCameraAndroidView,
        which: Int,
        idx: Int,
        v: Float,
    ) {
        val state = roiState.getOrPut(view) {
            arrayOf(
                floatArrayOf(0.15f, 0.10f, 0.70f, 0.30f),
                floatArrayOf(0.15f, 0.55f, 0.70f, 0.30f),
            )
        }
        state[which][idx] = v
        val r = state[which]
        if (which == REF) view.setRefRoi(r[0], r[1], r[2], r[3])
        else view.setSampleRoi(r[0], r[1], r[2], r[3])
    }

    companion object {
        const val REACT_CLASS = "RawCameraAndroidView"
        private const val REF = 0
        private const val SAMPLE = 1
    }
}
