package com.margelo.nitro.rawcameraandroid

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

// Nitro registration entry point for the RawCameraAndroid module.
// See docs/raw-camera-plan.md phase 7. The static init block calls
// RawCameraAndroidOnLoad.initializeNative() which loads the native lib
// (built from a minimal cpp-adapter.cpp), fires JNI_OnLoad, and
// registers "RawCameraAndroid" in the HybridObjectRegistry so JS
// createHybridObject('RawCameraAndroid') succeeds.
//
// createViewManagers registers RawCameraAndroidViewManager so JS can
// mount <RawCameraAndroidView /> as a Fabric native component.
class RawCameraAndroidPackage : BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? = null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider { emptyMap() }

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = listOf(RawCameraAndroidViewManager())

    companion object {
        init {
            RawCameraAndroidOnLoad.initializeNative()
        }
    }
}
