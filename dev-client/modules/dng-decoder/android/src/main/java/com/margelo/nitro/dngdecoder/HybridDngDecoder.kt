package com.margelo.nitro.dngdecoder

import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Log
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
        val tTotal = SystemClock.elapsedRealtime()
        val dims = IntArray(2)
        val err = arrayOfNulls<String>(1)
        val tNative = SystemClock.elapsedRealtime()
        val argb =
            nativeRenderPreview(dngPath, maxDim.toInt(), dims, err)
                ?: throw RuntimeException(err[0] ?: "renderPreview failed")
        val nativeMs = SystemClock.elapsedRealtime() - tNative
        val width = dims[0]
        val height = dims[1]

        val tBitmap = SystemClock.elapsedRealtime()
        val bitmap = Bitmap.createBitmap(argb, width, height, Bitmap.Config.ARGB_8888)
        val bitmapMs = SystemClock.elapsedRealtime() - tBitmap
        val cacheDir =
            NitroModules.applicationContext?.cacheDir
                ?: throw RuntimeException("No ReactApplicationContext for cache dir")
        val outFile = File.createTempFile("dng-preview-", ".png", cacheDir)
        val tPng = SystemClock.elapsedRealtime()
        FileOutputStream(outFile).use { fos ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, fos)
        }
        val pngMs = SystemClock.elapsedRealtime() - tPng
        bitmap.recycle()

        Log.i(
            TAG,
            "renderPreview($maxDim) → ${width}x${height}: " +
                "native=${nativeMs}ms bitmap=${bitmapMs}ms " +
                "png=${pngMs}ms total=${SystemClock.elapsedRealtime() - tTotal}ms",
        )

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
        // 1) Full-sensor dims. nativeReadMetadata returns SENSOR-native
        //    dims (landscape on most phones) — but the preview from
        //    nativeRenderPreview is already display-oriented (rotated
        //    per the DNG's orientation tag). Callers expect the
        //    sourceWidth/sourceHeight to be in the SAME orientation as
        //    the preview so a scale factor preview→source is correct;
        //    otherwise ROIs computed on the preview map to out-of-
        //    bounds positions on the full-res image when aspects
        //    disagree.
        val metaDims = IntArray(3)
        val metaOut = DoubleArray(3)
        val metaCfa = IntArray(4)
        val metaErr = arrayOfNulls<String>(1)
        val okMeta = nativeReadMetadata(dngPath, metaDims, metaCfa, metaOut, metaErr)
        if (!okMeta) throw RuntimeException(metaErr[0] ?: "DNG parse failed")
        val sensorWidth = metaDims[0]
        val sensorHeight = metaDims[1]

        // 2) Downscaled RGB preview via the same C++ decoder path
        //    renderPreview uses (nativeRenderPreview → ARGB8888 IntArray),
        //    then pack ARGB → interleaved RGB bytes for the JS side.
        //    Same layout iOS's readPreviewRgb writes.
        val previewDims = IntArray(2)
        val err = arrayOfNulls<String>(1)
        val argb = nativeRenderPreview(dngPath, maxDim.toInt(), previewDims, err)
            ?: throw RuntimeException(err[0] ?: "renderPreview failed")
        val w = previewDims[0]
        val h = previewDims[1]
        val nPix = w * h

        // 3) Align source dims to the preview's orientation. If preview
        //    is portrait but sensor is landscape (or vice versa), the
        //    orientation tag rotated 90° — swap sensor dims so the
        //    reported "source" matches. Detection: preview and sensor
        //    have opposite landscape-ness.
        val previewIsPortrait = h > w
        val sensorIsPortrait = sensorHeight > sensorWidth
        val swap = previewIsPortrait != sensorIsPortrait
        val sourceWidth = if (swap) sensorHeight else sensorWidth
        val sourceHeight = if (swap) sensorWidth else sensorHeight

        // ARGB IntArray (0xFFRRGGBB per pixel) → 3-bytes-per-pixel
        // interleaved RGB. Same conversion as tools/dng-cli-cpp/main.cpp
        // read-preview-rgb.
        val rgb = ByteArray(nPix * 3)
        for (i in 0 until nPix) {
            val px = argb[i]
            rgb[i * 3] = ((px shr 16) and 0xFF).toByte()
            rgb[i * 3 + 1] = ((px shr 8) and 0xFF).toByte()
            rgb[i * 3 + 2] = (px and 0xFF).toByte()
        }

        return PreviewRgb(
            width = w.toDouble(),
            height = h.toDouble(),
            pixels = com.margelo.nitro.core.ArrayBuffer.copy(rgb),
            sourceWidth = sourceWidth.toDouble(),
            sourceHeight = sourceHeight.toDouble(),
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

    override fun decodeDngRoisReduced(
        dngPath: String,
        rois: Array<Roi>,
    ): Array<LinearRgbReduced> {
        val flat = IntArray(rois.size * 4)
        for (i in rois.indices) {
            flat[i * 4] = rois[i].x.toInt()
            flat[i * 4 + 1] = rois[i].y.toInt()
            flat[i * 4 + 2] = rois[i].w.toInt()
            flat[i * 4 + 3] = rois[i].h.toInt()
        }
        val meanR = DoubleArray(rois.size)
        val meanG = DoubleArray(rois.size)
        val meanB = DoubleArray(rois.size)
        val domR = DoubleArray(rois.size)
        val domG = DoubleArray(rois.size)
        val domB = DoubleArray(rois.size)
        val err = arrayOfNulls<String>(1)
        val ok = nativeDecodeRoisReduced(
            dngPath, flat, meanR, meanG, meanB, domR, domG, domB, err,
        )
        if (!ok) throw RuntimeException(err[0] ?: "DNG decode failed")
        return Array(rois.size) { i ->
            LinearRgbReduced(
                mean = LinearRgb(r = meanR[i], g = meanG[i], b = meanB[i]),
                dominant = LinearRgb(r = domR[i], g = domG[i], b = domB[i]),
            )
        }
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

    private external fun nativeDecodeRoisReduced(
        path: String,
        rois: IntArray,      // flattened [x,y,w,h] per ROI
        outMeanR: DoubleArray,
        outMeanG: DoubleArray,
        outMeanB: DoubleArray,
        outDomR: DoubleArray,
        outDomG: DoubleArray,
        outDomB: DoubleArray,
        errorOut: Array<String?>,
    ): Boolean

    private external fun nativeRenderPreview(
        path: String,
        maxDim: Int,
        dims: IntArray,      // out: [width, height]
        errorOut: Array<String?>,
    ): IntArray?

    companion object {
        private const val TAG = "DngDecoder"

        init {
            System.loadLibrary("DngDecoder")
        }
    }
}
