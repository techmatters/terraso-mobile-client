package com.margelo.nitro.dngdecoder

import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip

@DoNotStrip
@Keep
class HybridDngDecoder : HybridDngDecoderSpec() {

    override fun readMetadata(dngPath: String): DngMetadata {
        val out = DoubleArray(3)
        val cfa = IntArray(4)
        val dims = IntArray(3)
        val err = arrayOfNulls<String>(1)
        val ok = nativeReadMetadata(dngPath, dims, cfa, out, err)
        if (!ok) throw RuntimeException(err[0] ?: "DNG parse failed")
        val cfaStr = cfa.joinToString("") { channelChar(it) }
        return DngMetadata(
            width = dims[0].toDouble(),
            height = dims[1].toDouble(),
            bitsPerSample = dims[2].toDouble(),
            cfaPattern = cfaStr,
            blackLevel = out[0],
            whiteLevel = out[1],
            isMonochrome = false,
        )
    }

    override fun renderPreview(dngPath: String, maxDim: Double): PreviewImage {
        // Not implemented on Android yet — the iOS path uses CIRAWFilter to
        // render a display-ready preview PNG for the ROI picker UI. On
        // Android the same job would need our C++ decoder to write out a
        // full-frame demosaic + tone map, or a separate path via
        // BitmapFactory (which doesn't understand DNG). Deferred.
        throw RuntimeException(
            "DngDecoder.renderPreview is not implemented on Android yet " +
                "(iOS-only for now — see docs/raw-camera-plan.md)"
        )
    }

    override fun decodeDngRois(dngPath: String, rois: Array<Roi>): Array<LinearRgb> {
        val flat = IntArray(rois.size * 4)
        for (i in rois.indices) {
            flat[i * 4] = rois[i].x.toInt()
            flat[i * 4 + 1] = rois[i].y.toInt()
            flat[i * 4 + 2] = rois[i].w.toInt()
            flat[i * 4 + 3] = rois[i].h.toInt()
        }
        val outR = DoubleArray(rois.size)
        val outG = DoubleArray(rois.size)
        val outB = DoubleArray(rois.size)
        val err = arrayOfNulls<String>(1)
        val ok = nativeDecodeRois(dngPath, flat, outR, outG, outB, err)
        if (!ok) throw RuntimeException(err[0] ?: "DNG decode failed")
        return Array(rois.size) { i -> LinearRgb(r = outR[i], g = outG[i], b = outB[i]) }
    }

    private fun channelChar(c: Int): String = when (c) {
        0 -> "R"
        1 -> "G"
        2 -> "B"
        else -> "?"
    }

    private external fun nativeReadMetadata(
        path: String,
        dims: IntArray,      // [width, height, bitsPerSample]
        cfa: IntArray,       // [cfa0, cfa1, cfa2, cfa3]
        out: DoubleArray,    // [blackLevel, whiteLevel, unused]
        errorOut: Array<String?>,
    ): Boolean

    private external fun nativeDecodeRois(
        path: String,
        rois: IntArray,      // flattened [x,y,w,h] per ROI
        outR: DoubleArray,
        outG: DoubleArray,
        outB: DoubleArray,
        errorOut: Array<String?>,
    ): Boolean

    companion object {
        init {
            System.loadLibrary("DngDecoder")
        }
    }
}
