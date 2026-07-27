package com.margelo.nitro.rawcameraandroid

import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip
import com.margelo.nitro.core.Promise

// Phase-7 stub. capturePhoto currently rejects — real CameraX + Camera2
// + DngCreator implementation lands in phase 7.1. See
// docs/raw-camera-plan.md.
@DoNotStrip
@Keep
class HybridRawCameraAndroid : HybridRawCameraAndroidSpec() {
    override fun capturePhoto(): Promise<CapturedPhoto> {
        return Promise.async {
            throw RuntimeException(
                "HybridRawCameraAndroid.capturePhoto not yet implemented " +
                    "(phase 7.1 will wire CameraX RAW + DngCreator)"
            )
        }
    }
}
