package com.margelo.nitro.rawcameraandroid

import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip
import com.margelo.nitro.core.Promise

// Nitro-facing API. All the CameraX + Camera2Interop + DngCreator work
// lives in CameraSessionManager (a Kotlin object / singleton) so it can
// be shared between this imperative HybridObject and the
// RawCameraAndroidView (which contributes its PreviewView's
// SurfaceProvider to the same session). See docs/raw-camera-plan.md
// phase 7.
@DoNotStrip
@Keep
class HybridRawCameraAndroid : HybridRawCameraAndroidSpec() {
    override fun capturePhoto(): Promise<CapturedPhoto> {
        return Promise.async { CameraSessionManager.capture() }
    }
}
