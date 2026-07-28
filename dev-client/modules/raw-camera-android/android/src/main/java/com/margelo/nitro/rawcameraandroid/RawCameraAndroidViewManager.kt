package com.margelo.nitro.rawcameraandroid

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

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

    companion object {
        const val REACT_CLASS = "RawCameraAndroidView"
    }
}
