package com.margelo.nitro.rawcameraandroid

import java.nio.ByteBuffer

// Thin Kotlin wrapper over the native per-ROI Y-plane analyzer. Loaded
// via the same libRawCameraAndroid.so that Nitro autolinks — no
// separate System.loadLibrary needed at the call site (the Nitro JNI
// OnLoad has already pulled the lib in).
//
// The analyzer is allocation-free per call: pass in a reusable
// DoubleArray(3) as `out`. On return it contains [mean, variance,
// count]. Safe to call from the CameraX ImageAnalysis thread.
object FrameAnalyzer {
    // Populated by nativeAnalyzeYPlane. Indices in order:
    const val OUT_MEAN = 0
    const val OUT_VARIANCE = 1
    const val OUT_COUNT = 2

    // The Y plane must be a direct ByteBuffer (CameraX
    // Image.Plane.buffer always is). rowStride bytes between successive
    // rows; may exceed planeWidth for padding.
    //
    // ROI is clamped to the plane; passing a fully-out-of-range ROI
    // returns count=0 and leaves mean/variance at 0.
    @JvmStatic
    external fun nativeAnalyzeYPlane(
        yPlane: ByteBuffer,
        rowStride: Int,
        planeWidth: Int,
        planeHeight: Int,
        roiX: Int,
        roiY: Int,
        roiW: Int,
        roiH: Int,
        out: DoubleArray,
    )
}
