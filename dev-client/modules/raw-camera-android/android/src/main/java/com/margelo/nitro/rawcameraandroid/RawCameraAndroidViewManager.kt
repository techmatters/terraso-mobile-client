package com.margelo.nitro.rawcameraandroid

import android.view.View
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

    companion object {
        const val REACT_CLASS = "RawCameraAndroidView"
    }
}
