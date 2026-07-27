package com.margelo.nitro.rawcameraandroid

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

// Nitro registration entry point for the RawCameraAndroid module.
// See docs/raw-camera-plan.md phase 7. Same pattern as
// DngDecoderPackage.kt — the static init block calls
// RawCameraAndroidOnLoad.initializeNative() which loads the native lib
// (built from a minimal cpp-adapter.cpp), fires JNI_OnLoad, and
// registers "RawCameraAndroid" in the HybridObjectRegistry so JS
// createHybridObject('RawCameraAndroid') succeeds.
//
// The View Manager for the CameraX preview will be registered here in
// phase 7.2 (createViewManagers).
class RawCameraAndroidPackage : BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? = null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider { emptyMap() }

    companion object {
        init {
            RawCameraAndroidOnLoad.initializeNative()
        }
    }
}
