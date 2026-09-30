# Munsell Chart Validator — Color Analysis Pipeline

This document describes how the Munsell chart validator turns a captured
DNG into per-swatch color measurements and Munsell notations. It does
NOT cover chart registration (finding where the swatches are in the
image) — that's a separate topic covered elsewhere.

## A note on "linear sRGB" vs. "sRGB"

The pipeline works in **linear sRGB** throughout, which is not the
same as regular sRGB. The two share the same primaries (Rec.709
red/green/blue chromaticities) and whitepoint (D65) but differ in
their transfer function:

| Space         | Gamma?      | Values proportional to photons? | Used for                       |
|---------------|-------------|--------------------------------|--------------------------------|
| sRGB          | Yes (~2.2)  | No                             | Displaying on screens          |
| Linear sRGB   | No          | Yes                            | Color math (WB, blending, XYZ) |

So in linear sRGB, doubling the physical light on any channel doubles
the value. In regular sRGB, doubling the value is closer to a `2^2.2 ≈
4.6×` change in physical light. Chromatic adaptation, area-averaging
pixel groups, and CIE XYZ conversion all only make physical sense in
linear light — otherwise scaling / summing / matrix-multiplying values
doesn't correspond to what the light itself is doing.

CIRAWFilter is configured with `.workingColorSpace: linearSRGB` so
the numbers we receive are photon-linear, and every downstream step
stays there until the final `labToMunsell`. The one exception is the
debug PNG preview and the flat-mask overlay, which are display-only
and use gamma-encoded sRGB (screens expect it).

## Overview

For each ROI (rectangle on the chart where a swatch lives), we:

1. Sample the DNG pixels inside the ROI → **linear-sRGB** (mean of pixels).
2. Optionally correct for capture-time illumination via a per-channel
   scale factor derived from a chosen reference cell.
3. Convert the corrected linear-sRGB → CIE XYZ → CIE L\*a\*b\* →
   Munsell notation.
4. Compute ΔE2000 between measured and expected L\*a\*b\* to score how
   well the corrected measurement matches the chart's published color.

All correction and colorspace conversion happens in **linear light**.
sRGB gamma is never applied on the analysis path (it's only used by
the debug CSV export and the preview PNGs, both display-only).

## 1. What the DNG decoder returns

The `DngDecoderHybrid.decodeDngRois(dngPath, rois)` call returns one
`LinearRgb` object per ROI: `{r, g, b}`, all floats.

- The pipeline is Apple's `CIRAWFilter` on iOS (C++ demosaic on Android
  — not yet used for chart validation).
- `boostAmount = 0` and `boostShadowAmount = 0` are set on the filter so
  the RAW pipeline stays as neutral as possible — no highlight roll-off,
  no shadow lift.
- Each ROI's `{r, g, b}` is the **mean of every pixel inside the rect**,
  in **linear sRGB** (Rec.709 primaries, D65 whitepoint, unclamped).
- No YUV / YCbCr anywhere — those only appear in the CSV export as a
  display convenience.

## 2. Per-channel WB correction

Users pick a reference cell (default `10YR 5/1` — mid-value, low-chroma
neutral). Then:

```
raw       = measured linear-sRGB of the reference ROI
expected  = MUNSELL_10YR_CELLS[ref].expectedLinearRgb
            (precomputed from munsellToLinearRgb(notation) at module load)

scale.r = expected.r / raw.r
scale.g = expected.g / raw.g
scale.b = expected.b / raw.b
```

Divisor guarded: if any `raw.channel < 1e-4`, that channel's scale is 1
(so we don't blow up on a black patch).

Applied uniformly to every measurement:

```
measured.r = raw.r * scale.r
measured.g = raw.g * scale.g
measured.b = raw.b * scale.b
```

This is a **naive per-channel gain in linear-sRGB space** — a
first-order approximation of chromatic adaptation. See §5 for how it
compares to a proper von Kries / Bradford adaptation.

If the user clears the reference cell, `scale = (1, 1, 1)` and
measurements pass through unchanged.

## 3. Colorspace chain

The `munsell` npm library provides the conversions:

```
measured linear-sRGB
    ─── linearRgbToXyz(r, g, b) ───►  CIE XYZ (Rec.709 primaries, D65)
    ─── xyzToLab(X, Y, Z)     ───►  CIE L*a*b* (D65 reference white)
    ─── labToMunsell(L, a, b) ───►  Munsell notation "10YR 5.2/3.8"
```

`labToMunsell` is an iterative solver; if it fails to converge or hits
its iteration cap we fall back to the expected notation as the label
(but ΔE is still computed from the true Lab).

## 4. ΔE (color difference)

For each cell:

```
expectedLab = munsellToLab(cell.notation)   // through the same library
measuredLab = xyzToLab(linearRgbToXyz(measured))
deltaE      = DeltaE.getDeltaE00(measuredLab, expectedLab)
```

CIEDE2000 — the current perceptual-difference standard. Rough intuition:

| ΔE     | Perception                              |
|--------|-----------------------------------------|
| < 1    | Not perceptible by the average observer |
| 1 – 3  | Just noticeable                         |
| 3 – 6  | Small but clearly different             |
| > 12   | Very different                          |

The result grid color-codes each cell background by ΔE — green under 3,
yellow under 6, orange under 12, red above.

## 5. Where this approximation is loose

The correction step (§2) assumes **illumination looks like a per-channel
scale factor on the linear-sRGB output**. That's only true if:

1. The illuminant is close to a linear multiple of D65 (roughly true for
   diffuse daylight, not true for warm indoor lighting).
2. The camera's spectral response is already RGB-diagonal in linear-sRGB
   (true after CIRAWFilter's WB step, approximately).
3. Human vision responds to illumination changes linearly in RGB (it
   does not — cone response is closer to a matrixed transform in LMS
   space).

For a reference cell that's near-neutral (like 5/1), and captures made
in reasonably neutral daylight, the per-channel gain is a decent
approximation. For strongly non-neutral references or heavily tinted
illuminants, a von Kries / Bradford chromatic adaptation transform
(scale in LMS space, not linear-sRGB) is more accurate.

## Code entry points

- `analyzeMunsellChart(dngPath)` — end-to-end. Registers the chart, samples
  every ROI, returns `MunsellChartResult`.
- `computeCellResults(measurements, referenceNotation)` — applies the WB
  correction and computes measured/expected Lab + ΔE per cell.
- `csvFromCells(cells, referenceNotation)` — exports the results as CSV
  including both the corrected linear-sRGB and BT.709 8-bit YCbCr per
  swatch.
