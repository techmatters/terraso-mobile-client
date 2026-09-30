# Empirical postit-yellow calibration (2026-08-26)

Read of the currently-declared `POST_IT_YELLOW` reference against what
the sensor + pipeline actually see for the physical yellow post-it in
the Multi Ref Capture 0824 dataset. Analysis produced by
`scripts/calibrate-ref-card.mjs` — see that file for the exact
algorithm and CLI flags.

## Source

- Declared: `src/model/color/getColorFromLinearRgb.ts:39`
  `POST_IT_YELLOW = {r: 0.9542, g: 0.887, b: 0.362}`
- Empirical data: `Multi Ref Capture 0824/results/run.json` (post-relabel,
  post H×V-widened sweep, post batch-decode)
- Method: for each capture, derive per-channel WB gain from trusted
  neutrals (greycard alone, whibal alone, or least-squares over
  greycard + whibal + white), apply that gain to the raw postit
  sample, average across captures. See script for the math.

## Anchor strategies compared

Six strategies are exercised, each derives a per-channel WB gain
from one or more anchors, applies it to raw postit, averages
across shots:

- `greycard-only` — single-ref gain from physical greycard
- `whibal-only` — single-ref gain from physical whibal
- `auto-only` — single-ref gain from the chip the analyzer's
  auto-WB picked for this shot (per-page-dependent)
- `neutrals-lsq` — least-squares over the three physical neutrals
  (greycard + whibal + white)
- `near-neutrals-lsq` — least-squares over every chart chip whose
  expected linear-sRGB has max-min < 0.1 (trusted printed-ink
  anchors; excludes saturated chips whose gain would be dominated
  by hue)
- `all-anchors-lsq` — every anchor above pooled into one LSQ

## Numbers (Sun, RAW — 73 shots, 73 with auto anchor, 1137 near-neutral chips pooled)

| Strategy              | Empirical (R, G, B)         | Std-dev (R, G, B)       |
| --------------------- | --------------------------- | ----------------------- |
| greycard-only         | (0.9090, 0.7957, 0.5377)    | (0.1500, 0.1257, 0.0727)|
| whibal-only           | (0.8300, 0.7636, 0.5754)    | (0.0954, 0.0825, 0.0452)|
| auto-only             | (0.6507, 0.6101, 0.4469)    | (0.1425, 0.1327, 0.0980)|
| **neutrals-lsq**      | **(0.8268, 0.7798, 0.5478)**| **(0.0736, 0.0640, 0.0235)** |
| near-neutrals-lsq     | (0.7232, 0.6660, 0.4873)    | (0.1516, 0.1385, 0.1064)|
| all-anchors-lsq       | (0.7598, 0.7164, 0.5156)    | (0.1480, 0.1374, 0.0963)|

## Numbers (Shade, RAW — 125 shots, all with auto anchor, 1932 near-neutral chips pooled)

| Strategy              | Empirical (R, G, B)         |
| --------------------- | --------------------------- |
| greycard-only         | (0.6083, 0.5129, 0.3521)    |
| whibal-only           | (0.6286, 0.5507, 0.4207)    |
| auto-only             | (0.2900, 0.2608, 0.1896)    |
| neutrals-lsq          | (0.6192, 0.5689, 0.4089)    |
| near-neutrals-lsq     | (0.3358, 0.3012, 0.2210)    |
| all-anchors-lsq       | (0.4045, 0.3675, 0.2710)    |

## Numbers (Sun, photo — for reference, but non-linear pipeline)

| Strategy              | Empirical (R, G, B)         |
| --------------------- | --------------------------- |
| neutrals-lsq          | (0.7000, 0.6104, 0.2523)    |

## Interpretation

1. **Blue channel under-declared.** Sun-RAW `neutrals-lsq` empirical
   B = 0.548 vs declared 0.362 — **+51%**. Yellow paper reflects more
   short-wave light than the current value implies. Every strategy
   agrees on B > 0.45 (declared says 0.36).

2. **Chromaticity stable across illuminants** (physical-neutral
   anchors). Normalised sun-RAW `neutrals-lsq` ratio R : G : B ≈
   1 : 0.94 : 0.66; shade-RAW ratio ≈ 1 : 0.92 : 0.66. So the
   empirical *hue* is consistent — only overall brightness varies.
   Chip-anchor strategies give similar hue (~1 : 0.92 : 0.68) but
   at systematically lower brightness — see the bias-source note
   below.

3. **Absolute brightness sun-vs-shade differs 25%.** This shouldn't
   happen after WB normalisation. Almost certainly caused by the
   greycard sample region being slightly clipped in shade captures
   (higher chroma at the edges of the sample rect biases the gain).
   The multi-card sweep visualisation in `run.html` shows the same
   pattern anecdotally — some cyan boxes sit off-center inside the
   mask cutout even after the H×V sweep converges.

4. **Greycard-vs-whibal anchor disagreement.** 3–17% per channel
   depending on the shot. If the sensor were perfectly linear and
   both cards were sampled correctly, they'd agree exactly. This is
   the calibration's practical noise floor and puts a lower bound on
   how well we can trust any single-anchor number.

5. **RAW vs JPEG diverges massively.** Sun photo empirical =
   (0.70, 0.61, 0.25) vs Sun RAW empirical = (0.83, 0.78, 0.55).
   Expected — JPEG has HDR+ tone-mapping baked in, so it's not a
   linearity-preserving path. Use RAW numbers for any calibration
   update.

6. **Chart-chip anchors give dimmer postit than physical-neutral
   anchors.** Sun `near-neutrals-lsq` = (0.72, 0.67, 0.49) is ~15%
   dimmer than `neutrals-lsq` = (0.83, 0.78, 0.55). Under shade the
   gap grows to ~half. Two competing biases:

   - **Chip-anchor bias (dimmer postit)**: chart chip sample rects
     sit on printed circles surrounded by paper-white. Any paper
     edge that bleeds into the sample makes the chip read
     *brighter* than the pure chip → gain LOWER → postit reads
     dimmer.
   - **Physical-neutral bias (brighter postit)**: greycard / whibal
     sit in dark-strip mask cutouts. Any strip-material
     contamination in the sample makes the card read *darker* →
     gain HIGHER → postit reads brighter.

   Truth lives between the two — `all-anchors-lsq` splits the
   difference at (0.76, 0.72, 0.52) for sun.

7. **Std-dev doesn't improve with more chip anchors.** `neutrals-lsq`
   has the tightest std-dev (0.074, 0.064, 0.024); chip-based
   strategies are ~2× noisier (~0.15). Each shot's chip-anchor
   error is *systematic* (registration issue), not random noise, so
   pooling doesn't help. This also means the chart-chip vs
   physical-neutral disagreement is itself a *diagnostic* — improve
   sample-rect placement (both physical + chip) and the gap should
   collapse toward truth.

## Bracket estimate

The chart-chip and physical-neutral biases push in opposite
directions, so the true postit value under our pipeline sits between
them. Sun-RAW brackets:

- Lower bound (chip-only): **(0.72, 0.67, 0.49)**
- Upper bound (physical-only): **(0.83, 0.78, 0.55)**
- Midpoint (all-anchors-lsq): **(0.76, 0.72, 0.52)**

All three disagree with the declared `(0.9542, 0.887, 0.362)` — the
R+G are lower, B is much higher. High confidence the declared value's
blue channel is wrong.

## Suggested next moves

- **Simple update**: change `POST_IT_YELLOW` to the midpoint
  `(0.76, 0.72, 0.52)`, rerun analyzer, look at whether per-chip
  ΔE with postit as WB anchor drops meaningfully.

- **Fix sampling first**: the ~15% chart-chip vs physical-neutral
  gap (sun) — and the ~half gap under shade — is largely driven
  by registration slop. Improving the sample-rect placement (both
  physical ref-card sweep AND chart-chip localisation) would
  collapse the gap and tighten the bracket. Better bracket → more
  confident update.

- **Physical measurement**: the ideal answer would be reading
  post-it's spectral reflectance with a spectrometer + integrating
  against D65 — this gives "the paper's actual color" independent
  of any sensor bias. What we compute here is "what our pipeline
  sees" which conflates paper + sensor + WB errors.

## Reproducing

From `dev-client/`:

```
node scripts/calibrate-ref-card.mjs \
  '/Users/johannes_schmidt/Library/CloudStorage/GoogleDrive-johannes@terraso.org/My Drive/Multi Ref Capture 0824/results/run.json' \
  --target postit --illum sun --format raw
```

Change `--illum sun` to `shade`, `--format raw` to `photo`, or
`--target postit` to `whibal`/`greycard`/`white` to explore. The
`--target` handle also works for calibrating the OTHER physical
neutrals against each other (e.g. `--target greycard` uses whibal +
white + chip anchors to back-derive what greycard "really" is under
our pipeline — a way to sanity-check the greycard-vs-whibal
disagreement noted above).
