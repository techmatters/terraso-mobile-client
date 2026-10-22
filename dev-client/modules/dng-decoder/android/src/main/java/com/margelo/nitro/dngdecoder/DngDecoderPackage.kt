package com.margelo.nitro.dngdecoder

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

// Nitro modules don't expose classic ReactPackage-style NativeModules —
// registration happens in C++ via the HybridObjectRegistry. But we still
// need a Package that autolinking can find, so its `static { … }` init
// block runs at app startup and triggers System.loadLibrary. Without
// this, JNI_OnLoad never fires and `NitroModulesProxy.createHybridObject
// ("DngDecoder")` throws "not yet registered".
//
// Pattern mirrors NitroImagePackage.java in react-native-nitro-image.
class DngDecoderPackage : BaseReactPackage() {
    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? = null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider { emptyMap() }

    companion object {
        init {
            DngDecoderOnLoad.initializeNative()
        }
    }
}
