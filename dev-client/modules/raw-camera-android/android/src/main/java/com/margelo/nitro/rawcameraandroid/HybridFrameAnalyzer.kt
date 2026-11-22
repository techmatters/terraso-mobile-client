package com.margelo.nitro.rawcameraandroid

import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip
import java.nio.ByteBuffer

// Injectable live-frame analyzer (Option B). Configured from JS with the ROIs
// to watch + an onStats sink; CameraSessionManager pumps each analysis frame
// into onFrameNative (on the analysis executor thread — native, no JS hop per
// frame). It maps each fractional ROI to the sensor Y-plane, computes luma
// mean+variance via the shared native analyzer, and emits onStats (throttled)
// to JS. Luma only — the real color comes from the post-capture RAW decode.
@DoNotStrip
@Keep
class HybridFrameAnalyzer : HybridFrameAnalyzerSpec() {
    @Volatile private var rois: Array<AnalyzerRoi> = emptyArray()
    @Volatile private var onStats: ((Array<RoiLumaStats>) -> Unit)? = null

    // Reused across the per-ROI loop; only touched on the single analysis
    // executor thread, so no synchronization needed.
    private val out = DoubleArray(3)
    private var frameCounter = 0

    override fun configure(
        rois: Array<AnalyzerRoi>,
        onStats: (stats: Array<RoiLumaStats>) -> Unit,
    ) {
        this.rois = rois
        this.onStats = onStats
    }

    // Native-only (not in the Nitro spec): called by CameraSessionManager from
    // the analysis executor. Maps fractional display ROIs to the sensor Y-plane
    // with the rear-cam 90° axis-swap (same mapping the camera's own analysis
    // uses: sensor = (fracY*w, fracX*h, fracH*w, fracW*h)).
    fun onFrameNative(
        yPlane: ByteBuffer,
        rowStride: Int,
        planeWidth: Int,
        planeHeight: Int,
    ) {
        val cb = onStats ?: return
        val rs = rois
        if (rs.isEmpty()) return
        // ~15 Hz at 30 fps — plenty for a live quality bar, easy on the bridge.
        frameCounter++
        if (frameCounter % 2 != 0) return
        val stats =
            Array(rs.size) { i ->
                val r = rs[i]
                FrameAnalyzer.nativeAnalyzeYPlane(
                    yPlane,
                    rowStride,
                    planeWidth,
                    planeHeight,
                    (r.y * planeWidth).toInt(),
                    (r.x * planeHeight).toInt(),
                    (r.h * planeWidth).toInt(),
                    (r.w * planeHeight).toInt(),
                    out,
                )
                RoiLumaStats(
                    roi = i.toDouble(),
                    mean = out[FrameAnalyzer.OUT_MEAN],
                    variance = out[FrameAnalyzer.OUT_VARIANCE],
                )
            }
        cb(stats)
    }
}
