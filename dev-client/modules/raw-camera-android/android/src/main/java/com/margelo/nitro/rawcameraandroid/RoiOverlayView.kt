package com.margelo.nitro.rawcameraandroid

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import java.util.concurrent.atomic.AtomicInteger

// Real-time overlay for the RAW viewfinder. Sits on top of PreviewView
// inside RawCameraAndroidView's FrameLayout. Draws two rectangular
// ROIs (reference + sample) outlined in a colour reflecting the
// current per-ROI analysis result, with the outside-ROI area dimmed
// via a translucent black mask.
//
// Phase-8.0 first cut: hardcoded ROI positions + static grey outlines,
// no analyzer yet — just verifies the layering + alpha mask look
// right on top of the CameraX preview surface. Phase-8.2 will wire
// atomic result reads from the CameraSessionManager and invalidate
// on a ~15Hz timer so the outline colour reflects real-time analysis.
class RoiOverlayView
@JvmOverloads
constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {
    // Colour codes an analyzer will write here (per ROI). 0 = red
    // (inconsistent/bad), 1 = green (good). Extensible to more codes
    // later. AtomicInteger so the analyzer thread can write while the
    // UI thread's onDraw reads without a lock.
    val refColorCode = AtomicInteger(COLOR_UNKNOWN)
    val sampleColorCode = AtomicInteger(COLOR_UNKNOWN)

    // ROI positions as fractions of the view (0..1). Defaults are
    // stacked-portrait — reference on top third, sample on bottom
    // third, centred horizontally. JS side overrides via
    // RawCameraAndroidViewManager @ReactProp setters (refRoi{X,Y,W,H}
    // + sampleRoi{X,Y,W,H}); use setRefRoi/setSampleRoi below to keep
    // the analyser in sync.
    private var refRect = RectF(0.15f, 0.10f, 0.85f, 0.40f)
    private var sampleRect = RectF(0.15f, 0.55f, 0.85f, 0.85f)

    // Set the ref/sample ROI to (x, y, x+w, y+h) in display-space
    // fractions. Called by RawCameraAndroidView.setRefRoi/setSampleRoi
    // when the JS side updates the corresponding view props. Invalidates
    // the view so the next frame draws the new rect.
    fun setRefRoi(x: Float, y: Float, w: Float, h: Float) {
        refRect.set(x, y, x + w, y + h)
        invalidate()
    }

    fun setSampleRoi(x: Float, y: Float, w: Float, h: Float) {
        sampleRect.set(x, y, x + w, y + h)
        invalidate()
    }

    private val maskPaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xAA000000.toInt() // 66% opacity black
        }
    // Used to punch holes through the mask for the two ROIs — the
    // outside stays dim, the inside stays fully transparent so the
    // preview shows through unmodified.
    private val holePaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
        }
    private val strokePaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = STROKE_WIDTH_PX
        }

    init {
        // Needed for PorterDuffXfermode CLEAR to actually punch through
        // the mask into transparency instead of drawing onto the
        // hardware layer opaquely.
        setLayerType(LAYER_TYPE_SOFTWARE, null)
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val refPx =
            RectF(refRect.left * w, refRect.top * h, refRect.right * w, refRect.bottom * h)
        val samplePx =
            RectF(
                sampleRect.left * w,
                sampleRect.top * h,
                sampleRect.right * w,
                sampleRect.bottom * h,
            )

        // Fill the whole view with the dim mask, then punch the two
        // ROIs back to transparent.
        canvas.drawRect(0f, 0f, w, h, maskPaint)
        canvas.drawRect(refPx, holePaint)
        canvas.drawRect(samplePx, holePaint)

        // Outline each ROI in its current analysis colour.
        strokePaint.color = colorFor(refColorCode.get())
        canvas.drawRect(refPx, strokePaint)
        strokePaint.color = colorFor(sampleColorCode.get())
        canvas.drawRect(samplePx, strokePaint)
    }

    private fun colorFor(code: Int): Int =
        when (code) {
            COLOR_RED -> 0xFFFF3B30.toInt()
            COLOR_GREEN -> 0xFF34C759.toInt()
            else -> 0xFFCCCCCC.toInt() // unknown / not yet analysed
        }

    companion object {
        const val COLOR_UNKNOWN = -1
        const val COLOR_RED = 0
        const val COLOR_GREEN = 1

        private const val STROKE_WIDTH_PX = 6f
    }
}
