package com.margelo.nitro.dngdecoder

import android.graphics.Bitmap
import androidx.annotation.Keep
import com.facebook.common.internal.DoNotStrip
import com.margelo.nitro.NitroModules
import java.io.File
import java.io.FileOutputStream

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
        // Phase 5.4: sub-sampled demosaic in our C++ engine, materialized
        // as an ARGB8888 IntArray and packed into a Bitmap → PNG file.
        // Applies the same color pipeline as decodeRoi (WB via
        // AsShotNeutral, ColorMatrix1 inversion → sRGB, gamma-encoded).
        // Preview matches the RAW analysis's color space — no HDR+ tone
        // baked in (contrast with the earlier thumbnail-extraction
        // approach which used DngCreator's Google-flavored preview).
        val dims = IntArray(2)
        val err = arrayOfNulls<String>(1)
        val argb =
            nativeRenderPreview(dngPath, maxDim.toInt(), dims, err)
                ?: throw RuntimeException(err[0] ?: "renderPreview failed")
        val width = dims[0]
        val height = dims[1]

        val bitmap = Bitmap.createBitmap(argb, width, height, Bitmap.Config.ARGB_8888)
        val cacheDir =
            NitroModules.applicationContext?.cacheDir
                ?: throw RuntimeException("No ReactApplicationContext for cache dir")
        val outFile = File.createTempFile("dng-preview-", ".png", cacheDir)
        FileOutputStream(outFile).use { fos ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, fos)
        }
        bitmap.recycle()

        return PreviewImage(
            uri = "file://${outFile.absolutePath}",
            width = width.toDouble(),
            height = height.toDouble(),
        )
    }

    override fun readPreviewGrayscale(dngPath: String, maxDim: Double): PreviewGrayscale {
        // Not yet implemented on Android — the Munsell chart validator that
        // consumes this is iOS-only for now. Add a Kotlin implementation
        // when the tool is ported to Android.
        throw NotImplementedError(
            "DngDecoder.readPreviewGrayscale is not yet implemented on Android"
        )
    }

    override fun readPreviewRgb(dngPath: String, maxDim: Double): PreviewRgb {
        // Not yet implemented on Android — same rationale as
        // readPreviewGrayscale above.
        throw NotImplementedError(
            "DngDecoder.readPreviewRgb is not yet implemented on Android"
        )
    }

    override fun readPreviewRgbPhoto(imagePath: String, maxDim: Double): PreviewRgb {
        // Not yet implemented on Android — the Munsell chart validator's
        // photo path is iOS-only for now.
        throw NotImplementedError(
            "DngDecoder.readPreviewRgbPhoto is not yet implemented on Android"
        )
    }

    override fun decodePhotoRois(imagePath: String, rois: Array<Roi>): Array<LinearRgb> {
        throw NotImplementedError(
            "DngDecoder.decodePhotoRois is not yet implemented on Android"
        )
    }

    override fun extractDngPreviewJpeg(dngPath: String): String {
        // Android DNGs from DngCreator do not embed a full-resolution
        // JPEG preview the way iOS AVCapturePhoto DNGs do. When Android
        // RAW is fully supported we'd render the preview from the raw
        // bytes via the existing C++ decoder; today it isn't wired.
        throw NotImplementedError(
            "DngDecoder.extractDngPreviewJpeg is iOS-only"
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

    private external fun nativeRenderPreview(
        path: String,
        maxDim: Int,
        dims: IntArray,      // out: [width, height]
        errorOut: Array<String?>,
    ): IntArray?

    companion object {
        init {
            System.loadLibrary("DngDecoder")
        }
    }
}
