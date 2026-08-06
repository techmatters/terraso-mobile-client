# Munsell Color Error: Visualization and Metric Design

Notes on evaluating a camera-based Munsell prediction algorithm against ground-truth
Munsell values, with the goal of improving the algorithm.

---

## 1. Work in CIELAB cylindrical (LCh), not RGB

RGB error is misleading — a Euclidean distance of 20 in RGB means wildly different
perceptual things at different points in the space.

More importantly, LCh coordinates map almost one-to-one onto Munsell's own axes:

| CIELAB | Munsell |
| --- | --- |
| L\* | Value |
| C\* | Chroma |
| h | Hue |

So error decomposition in LCh is both perceptually meaningful and directly interpretable
to soil scientists — "we're reading chroma one step high in the 10YR page." This is
strictly better than a "brightness vs. color" split, which is the same instinct in a
worse basis.

### Two traps

**Hue error is ill-defined at low chroma.** Soil colors are full of chroma 1–2 samples
where hue angle is nearly meaningless — a 30° hue error there is perceptually nothing.
Don't plot Δh in degrees. Use:

```
ΔH* = 2 · sqrt(C₁ · C₂) · sin(Δh / 2)
```

which self-attenuates as chroma approaches zero.

**White point.** Munsell renotation is defined under Illuminant C. If the pipeline
converts through D65 anywhere, that bakes in a systematic hue/chroma shift that looks
like algorithm error but is a units bug. Verify this before interpreting any bias.

---

## 2. Visualizations

### Plot 1 — Is this bias or noise?

Three scatter plots, predicted vs. actual, one each for L\*, C\*, h, with a y=x line.

Boring, but it immediately shows regression-to-the-mean — very common: chroma compressed
toward the middle, extremes pulled in. If compression is present, that's a calibration
you can fit and apply directly. Big win before any deeper analysis.

### Plot 2 — Arrow field in a\*b\*, with lightness retained

Arrows from actual → predicted, projected onto the a\*b\* plane. Arrow **color** encodes
ΔL\* on a diverging map (blue = too dark, red = too light).

Lightness doesn't have to be dropped — it just has to be encoded differently. Soil colors
occupy a narrow wedge of a\*b\* (roughly 10R–5Y), so the plot stays legible rather than
turning into a hairball.

Then facet it: same plot repeated in a grid, one panel per Value band (2/, 3/, 4/, …).
That reveals whether the algorithm fails specifically on dark or wet samples.

### Plot 3 — The Munsell-book layout (likely the best deliverable)

Lay it out the way the book is laid out:

- One panel per hue page
- Value on the vertical axis, Chroma on the horizontal
- Arrows drawn in that plane
- Arrow color = number of hue pages the prediction landed off by

Anyone who uses the book can read this instantly, and a systematic error like "reads
7.5YR as 10YR" jumps off the page.

### Plot 4 — Residual correlation

Correlated errors across the three axes aren't a reason to abandon the decomposition —
they're a fourth plot. Do a 3×3 scatter matrix of the *residuals* (ΔL vs ΔC, ΔL vs ΔH,
ΔC vs ΔH).

If ΔL and ΔC are correlated it shows in one glance, and that's diagnostic: it usually
means an exposure or white-balance problem rather than a color-science problem.

### Alternative framing: classification, not regression

If ground truth is a finite chip set (the soil book is ~440 chips), the headline number
isn't mean ΔE — it's *% exact chip* and *% within one step on each axis*. The natural
visual is a chip-grid heatmap colored by per-chip accuracy, which also exposes
sample-count gaps in the dataset.

---

## 3. Choosing an error metric

### First, verify what the current ΔE actually is

The name gets attached to several different things:

- **ΔE\*ab (CIE 1976)** — plain Euclidean distance in Lab. Better than RGB, but overweights
  chroma differences at high chroma and misbehaves in the blues.
- **ΔE00 (CIEDE2000)** — adds lightness/chroma/hue weighting functions plus a hue-rotation
  correction. Much better perceptual agreement.
- **Euclidean RGB** — if this is what's under the hood, that's the first fix, and a big one.

### ΔE00 is a poor *loss function*

This matters specifically when the metric is used as an optimization objective rather
than a report card. ΔE00 was fit for small, near-threshold differences between solid
patches under controlled viewing. It isn't a proper metric — it violates the triangle
inequality, and the hue-rotation term makes it non-smooth. Any gradient-based fitting
will feel that.

**Use CAM16-UCS (or CAM02-UCS) Euclidean distance as the objective.** It's constructed so
that ordinary Euclidean distance *is* the perceptual difference — smooth, well-behaved,
a true metric, and valid over a wider range of magnitudes.
(`colour.difference.delta_E_CAM16UCS` in colour-science.)

Report ΔE00 for comparability with the literature; optimize against CAM16-UCS.

### The bigger reframe: perceptual distance may not be the real loss

The output isn't a color, it's a Munsell string that feeds a soil determination. What
does an error *cost*? Some errors are free and some are catastrophic, and ΔE can't tell
them apart.

A mollic epipedon needs value ≤ 3 moist and chroma ≤ 3; redox concentration calls turn on
chroma thresholds. An error of ΔE 3 that flips value 3 to value 4 is far worse than an
error of ΔE 6 entirely inside the 10YR 5/4 neighborhood.

If the downstream use is classification, a threshold-aware loss — or at minimum a
chip-step distance weighted by how much users care about each axis — is closer to the
truth than any perceptual metric.

---

## 4. Using this to actually drive improvement

- **Don't optimize the mean.** Use median or 90th percentile. There's almost certainly
  label noise and some bad captures, and mean ΔE lets a handful of rows steer the fit.

- **Remove bias before optimizing scatter.** If the pred-vs-actual plots show compression
  or a coherent offset, fit that correction first — it's cheap, and it changes what the
  remaining error looks like.

- **Keep a vector, not a scalar, during development.** RMS of ΔL, ΔC, ΔH separately, plus
  % exact chip. Collapse to one number only for the final optimizer; otherwise a scalar
  hides which subsystem regressed.

- **Watch for session-level structure.** For a camera pipeline, a large share of error is
  illuminant estimation, which shows up as a coherent a\*b\* shift across an entire capture
  session rather than as per-sample noise. Optimizing the pooled error means tuning the
  algorithm to average away a nuisance parameter that should be estimated instead. Add
  capture session as a grouping variable and check how much variance it absorbs.

**Check the session effects before touching the metric at all.** If they dominate, no
error function will rescue you.

---

## 5. Tooling notes

- `colour-science` handles Munsell ↔ xyY ↔ Lab (`colour.notation.munsell_colour_to_xyY`)
  and the ΔE variants.
- It's slow on large batches — precompute the chip lookup once into a table rather than
  converting per-row.
- Keep the white point consistent throughout (see Illuminant C note above).
