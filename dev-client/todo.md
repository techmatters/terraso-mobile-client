# TODO: Improve Color Algorithm Error Handling

## Issue
Sentry error: `TERRASO-LPKS-2DF` - "Unexpected color algorithm failure!"

## Root Cause
User cropped to a completely white/blank area when selecting the "reference" region instead of the yellow post-it note.

The `dominantColor` function in `src/model/color/colorDetection.ts` filters out white pixels (r, g, b all > 250). When the reference image is all white, every pixel gets filtered out, leaving nothing for the `quantize` algorithm, which returns `false` and throws a generic error.

## Evidence
- `soil.jpg` - Valid dark soil image
- `reference.jpg` - Completely white (histogram shows single spike at 255)
- Photos attached to Sentry event with message "color algorithm failure"

## Suggested Fix
Add detection for blank/white images and show a helpful error message:

```typescript
// In dominantColor() or getColorFromImages()
if (pixelArray.length === 0) {
  throw new Error('Image appears blank or overexposed. Please retake the photo.');
}
```

Or better UX: detect this before the user taps "Analyze" and show inline guidance like "Reference area appears blank. Please select the yellow reference card."

## Files
- `src/model/color/colorDetection.ts` - Algorithm code
- `src/screens/ColorAnalysisScreen/ColorAnalysisHomeScreen.tsx` - UI that calls the algorithm
