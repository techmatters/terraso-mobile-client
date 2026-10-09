# Munsell capture findings & recommendations

Analysis of the Aug 2026 soil-colour test runs (`run.json`: 6813
captures across Pixel 7, Pixel 4, iPhone 16 Pro Max; RAW + JPEG; the
multi-reference WB sweep described in
[munsell-multishot.md](./munsell-multishot.md)). Goal: minimise ΔE2000
for **both** Android and Apple.

**Methodology.** Per-capture ΔE = median ΔE2000 over the chart's
non-reference, non-excluded chips. Device from `image_metadata.model`.
WB-reference labels: `autochip` = WB anchored on an **on-chart neutral
chip** (an in-scene neutral, lit identically to the chips being
measured); `greycard` / `whibal` / `white` / `postit` = the external
reference cards taped alongside the chart. ΔE excludes the WB anchor
chip itself.

---

## TL;DR

- The single biggest lever is **not the phone** — it's using an
  **in-scene mid-grey neutral** for white balance instead of an
  external card. It helps both phones and both formats, and makes the
  result nearly illumination-independent.
- Android RAW's weakness is **highlight clipping** (no HDR fusion on a
  single RAW), not an inherent colour problem. Protect the highlights
  and Pixel 7 RAW gets close to iPhone.
- **Illumination (sun/shade/mixed) barely matters** once WB is an
  in-scene neutral and nothing clips. "Shade is best" is not supported.
- Recommended path for Android: **ROI-space exposure fusion** — bracket
  exposures and merge per-patch in radiance space (no pixel alignment).

**Best achievable today** (RAW + on-chart neutral WB + no clipping):

| Device | median ΔE | (greycard-RAW, what we'd been judging by) |
|---|---|---|
| iPhone 16 Pro Max | **2.6** | 4.8 |
| Pixel 7 | **4.7** | 7.0 |
| Pixel 4 | 5.4 *(n=13, low confidence)* | 9.5 |

---

## 1. Biggest lever: an in-scene neutral for white balance

On-chart neutral (`autochip`) beats every external card, for every
device and format. On Pixel 7 RAW, non-clipped, by light condition:

| light | autochip | greycard |
|---|---|---|
| mixed | 4.8 | 5.4 |
| sun | 4.7 | 8.0 |
| shade | 4.7 | 11.0 |

The in-scene neutral is lit identically to the chips, so it cancels the
illuminant perfectly and the result is **illumination-invariant**. The
external greycard is lit slightly differently and its error grows in
flatter/shade light.

**But the Munsell-chip anchor is a lab-only upper bound — not what ships.**
In the field there is no Munsell chart, so `autochip`'s ~4.7 is the best
case, not the practical target. The realistic options and what the data
says about them:

- **A grey card or WhiBal held in-frame** — what most users can do. In
  this dataset those in-frame external cards gave **~6–7 on Pixel 7 RAW**
  (greycard 7.0, whibal 7.2) and **~4.8–6 on iPhone RAW**. Better than
  nothing; short of the 4.7 upper bound. Placement (adjacent, coplanar to
  the soil), spectral neutrality, and a sensible grey level all help close
  the gap.
- **Mind the card's brightness.** An 85%-grey or WhiBal card is *light* and
  will clip in bright sun at the exposure that properly exposes dark soil —
  exactly the one case the §6 fusion safeguard addresses. **Pure white is a
  trap** (iPhone white 33, Pixel 4 white 44). A mid-grey is safer.
- **No card at all** — accuracy suffers and there isn't much we can do;
  the least-bad fallback is **white paper photographed in open shade**
  (diffuse light, no clipping).

**Product translation.** Don't require a specific pro card. *Suggest*
users include a neutral reference — an 85% grey card, a WhiBal, or white
paper in shade — co-located and coplanar with the soil, and lit the same.

## 2. Android RAW's problem is highlight clipping, not the phone

Android RAW is a **single exposure with no fusion**, so clipped
highlights lose colour permanently. iPhone's fusion exposes highlights
well without wrecking colour — which is why iPhone RAW is clean.

Pixel 7 RAW (greycard), median ΔE:

| exposure | median ΔE |
|---|---|
| well-exposed | ~5–6 |
| >10% of cells clipped | **23.7** |
| ISO ≤ 60 | 6.2 |
| ISO 61–150 | 23.3 |
| ISO 151–400 | 28.4 |

Brighter raw = worse (rawLum quartiles 5.5 → 16.1). The high-ISO /
long-exposure manual shots (sweep shots 6–9) are the ones that clipped
and inflated ΔE. **Expose to protect the highlights**; slightly dark is
fine, clipped is fatal.

## 3. Illumination barely matters (shade is a red herring)

Once WB is an in-scene neutral and nothing clips, shade ≈ sun ≈ mixed
≈ 4.7 (table in §1). Shade only *looked* worst because **31% of shade
shots clipped** (vs 4–5% in sun/mixed) and the greycard reference is
illumination-sensitive. Any even, diffuse light is fine; just avoid
conditions that blow out the brightest patch.

## 4. Multi-shot averaging helps — modestly

Pixel 7 RAW greycard: burst-averaged 5.9 vs single-frame 7.5. Real but
small, and only once exposure is right. The earlier "multi-shot didn't
help" impression is because those sessions were also clipping / high-ISO.

## 5. Recommended capture recipes

- **iPhone:** RAW + in-scene mid-grey neutral WB → ~2.6. Already good.
- **Pixel / Android (target ~4.5–4.7):**
  1. In-scene mid-grey neutral for WB (§1).
  2. Protect highlights — manual/locked exposure, or AE with **−1 to −2
     EV**, so the brightest relevant patch stays below sensor saturation.
  3. Low ISO (≤ ~60) with a correspondingly longer shutter on a steady
     mount.
  4. Burst-average several same-exposure frames to denoise (§4).
  5. Do **not** add brighter "manual" exposures — those are what clipped
     and wrecked ΔE. Exposure bracketing/fusion is a safeguard only (§6),
     not a ΔE lever here.

The residual iPhone (2.6) vs Pixel 7 (4.7) gap is the cleaner
sensor/fusion — likely not fully closable, but ~4.7 is a large
improvement over the 7–16 we were seeing.

## 6. ROI-space exposure fusion — validated, and it is NOT the lever

The idea was to emulate iPhone's fusion cheaply: since the output is ~30
ROI colours (not a sharp image), pixels are never blended across frames,
so **no deghosting / sub-pixel alignment is needed**. We implemented and
tested it offline on the Pixel 7 bracket sets (auto burst + manual sweep
shots 6–9).

**Result: no measurable ΔE benefit on this data.** Per-chip fusion (pick
each chip's longest non-clipped exposure, merge in radiance space, WB
from the on-chart neutral) scored median ΔE **7.36 — identical to the
auto frame alone (7.36)**; 0.00 median per-scene improvement.

Why, and when it *would* help:

- **Radiance is exposure-invariant.** `raw / (exposureTime · ISO-gain)`
  estimates the same scene radiance regardless of exposure, so merging
  exposures only changes the answer where a frame **clips** (loses a
  channel) or is **noise-limited**.
- **The auto exposure never clipped** — 0 of 64 scenes had a clipped chip
  in the auto frame. The auto frame is the *shortest* exposure, so it
  already protects highlights. All the clipping that inflated ΔE came from
  the *manual, longer-exposure* shots (6–9) — i.e. from over-exposing on
  purpose, not from a dynamic-range limit.
- The ΔE floor here (~7 greycard, ~4.7 on-chart neutral) is **systematic**
  (WB reference / illuminant / sensor colour transform). Exposure fusion
  cannot touch systematic error — every exposure of the same scene shares
  it.

**So fusion is a safeguard, not a primary lever.** Keep it in reserve for
the one case it addresses: a scene whose dynamic range exceeds a single
exposure, forcing a choice between clipped highlights and noisy shadows —
e.g. the new **mid-grey neutral patch in bright direct sun** might clip at
the exposure that properly exposes dark soil. There, adding a *shorter*
frame and doing the per-ROI radiance merge above recovers the clipped
patch. It did not arise in this (controlled) dataset.

What *does* pay off from multi-shot: **averaging several same-exposure
frames** (burst) for noise (§4) — distinct from bracketing.

## 7. Bad captures

`~/Downloads/munsell0826/bad-captures.csv` lists flagged
fixture×format units with a reason, so a few can be pulled into
`run.html` to eyeball:

| reason | count |
|---|---|
| SKEWED (registration off-frame) | 405 |
| FAILED_REGISTRATION | 216 |
| CLIPPED_OVEREXPOSED | 183 |
| TOO_DARK | 21 |
| POOR_REGISTRATION | 10 |

## Android capture — options still worth exploring

- ~~Drop clipped pixels inside the reducer.~~ **Implemented + measured — not
  worth it.** The reducer now computes clipped-pixel-excluded siblings of
  both mean and dominant (`raw_linear_rgb_noclip` /
  `raw_linear_rgb_dominant_noclip`, exposed as reducer options in
  `munsell-error.html`). On the full dataset it's **a wash, even slightly
  negative**: over the cells that actually clip, median ΔE goes 8.01→8.06
  (mean) and 12.03→12.22 (dominant), and only ~39% of clipped cells improve.
  The big win I first reported (31.6→26.3) was a biased subset — only the
  *severely* over-exposed `manual,lightshade` shots. So excluding clipped
  pixels helps only badly-blown captures (which shouldn't be taken) and
  mildly *hurts* elsewhere (fewer pixels = noisier estimate). Confirms the
  real fix is to **not clip** (§2), not to post-process clipped pixels.
- **Low-ISO-on-a-tripod vs high-ISO handheld burst.** Noise ∝ 1/√(total
  photons), so a single long low-ISO exposure and N short high-ISO frames
  reach similar SNR at similar total integration time. The per-ROI averaging
  insight (§6) means **handheld burst needs no pixel alignment** — each
  frame is registered independently and only ~30 ROI colours are averaged —
  so handheld multi-frame is viable and more practical than a tripod. Lean
  handheld burst at auto exposure; reserve a steady mount for very dim light.
- **Add *darker* bracket frames, not brighter ones.** The brighter manual
  shots (6–9) only added clipping and hurt (§2). *Darker* frames are the
  useful direction: cheap highlight insurance, especially for a light
  (85%/WhiBal) reference card in bright sun. Combined with per-ROI fusion
  (§6) they recover any clipped patch without the downside.

## Open questions / next steps

- ~~Validate ROI-space fusion~~ **Done** (§6): no ΔE benefit on this data
  (auto exposure never clipped); keep as a high-dynamic-range safeguard
  only. The real lever is the WB reference.
- ~~Make `dominant` real on iOS RAW~~ **Done**: the standalone `dng-cli`
  now links the shared C++ median-cut (`dngcli_dominant_linear_rgb`) and
  computes a real dominant on the Apple CIRAWFilter path, matching the app
  + Android.
- **Reducer: mean beats dominant on this data — and that's expected.**
  Across devices, `dominant` is ~0.7 ΔE *worse* than `mean` (iPhone RAW
  5.9→6.6, Pixel 7 9.8→10.6). Munsell chips are flat, uniform patches, so
  `mean` is the precise average while median-cut bins into a coarse 5-bit
  histogram and returns the biggest cluster's centroid — a quantisation
  *jitter* (~0.011/channel, ~0 luminance bias), pure noise with no
  robustness payoff here. Dominant's advantage only shows on **non-uniform**
  ROIs (textured soil, specular flecks, partial card coverage), which this
  validation chart doesn't have — so the chart can't demonstrate it, and
  **mean stays the default** for chip validation.
- ~~JPEG dominant~~ **Added + measured.** The Swift photo path now computes
  a real median-cut dominant (for raw-less cameras). On JPEG it's **also
  marginally worse than mean** (6.79 vs 6.74) — same quantisation story as
  RAW. So for raw-less cameras, **JPEG mean** is the right default.
- ~~Soft-dominant reducer idea~~ **Framework built; converges on chips.**
  `analyze-fixtures --emit-histograms` now emits a per-ROI colour histogram
  (`raw_histogram`), and `scripts/munsell-reducer-experiment.js` reconstructs
  any reducer (mean / mode / soft-dominant variants / median-cut) from it and
  compares ΔE — no re-decode needed. On the current uniform chips **every
  reducer converges to ~6.6–6.8 ΔE**: soft-dominant reverts to mean because a
  pure chip is a single colour cluster. The experiment only discriminates on
  **textured real-soil captures** (multi-cluster patches) — capture some with
  a reference patch and re-run the script to actually test soft-dominant.
- **Characterise the field grey/WhiBal card** (spectral neutrality + grey
  level) so its WB residual is understood; a too-light card clips in sun.
- Collect more Pixel 4 (n=13) before trusting its numbers.
- Illumination-evenness bar chart in `run.html` still uses a comparability
  scale; a per-capture adaptive scale is a pending nicety (not blocking).
- Dominant algorithm: the Swift paths downscale each ROI to ≤256px before
  the (shared C++) median-cut; the Android C++ path uses all pixels. Since
  median-cut bins to a coarse 5-bit histogram this is assumed negligible, so
  the downscale is left as-is rather than unified. Also, "5 vboxes" is a
  tunable constant, not a principled stop — an adaptive stop (split until box
  variance/share stabilises) is worth trying via the offline histogram tool.

## Device & reference-card notes

- **Why iPhone beats Pixel — two separate effects.** (1) *Reference match*:
  iPhone's sensor renders the reference cards closer to the hardcoded
  "true" values than Pixel's does, so WB-from-a-card is more accurate on
  iPhone. (2) *Irreducible floor*: even with the `self` anchor (an on-chart
  neutral — removes the WB-reference error, and a mid chip doesn't clip),
  iPhone still beats Pixel 7 **3.3 vs 5.4 ΔE**. That ~2 ΔE residual is
  sensor + colour-science quality: Apple's computational/ProRAW pipeline
  (via CIRAWFilter) is cleaner and better colour-characterised than Pixel's
  rawer DNG readout decoded through our C++ matrix.
- **Why postit is catastrophic on Pixel (18) but OK on iPhone (8).** The
  Post-it is a *saturated* yellow, and saturated colours are rendered very
  differently by sensors with different spectral response / colour matrices
  (measured postit B:R is 0.64 on iPhone vs 0.44 on Pixel 7). WB anchored on
  a single hardcoded value (`POST_IT_YELLOW = 0.9542, 0.887, 0.362`) can't be
  right for both; it's biased for Pixel, so Pixel's postit-WB is badly off.
  `scripts/calibrate-ref-card.mjs` was built to quantify exactly this
  disagreement. Lesson: never WB off a saturated reference — use a neutral
  (grey/WhiBal), which all sensors agree on and which stays device-robust.
- **"other" device = iPhone.** The viewer buckets device by path/filename
  token; the iPhone multi-ref captures live in a `…/RAW Images/` folder with
  filenames like `10R_RAW_light_multi.dng` (no device slug), so they fall to
  "other" — but their metadata model is `iPhone 16 Pro Max`. **Fixed:**
  `deviceOf` now prefers `image_metadata.model`.

## Intrinsic color science — can a per-device profile help? (No, not here)

Tested fitting a per-device color correction (3×3, 3×3+offset, degree-2
root-polynomial) that maps measured → true Munsell, trained on half the
captures and evaluated on the held-out half
(`scripts/munsell-color-correction-experiment.js`). Result, median ΔE:

| WB anchor | iPhone base → best | Pixel 7 base → best |
|---|---|---|
| greycard | 8.6 → **5.8** | 8.0 → 8.0 |
| self (ideal) | 3.6 → 3.6 | 4.6 → 4.6 |

**A per-device matrix does not fix intrinsic color science once WB is good.**
The iPhone gain in the greycard row is the matrix *partially re-doing the
white balance* (greycard WB is imperfect) — with a proper in-scene neutral
(`self`) there's no systematic bias left, so the matrix (and the root-poly)
add nothing (3.6→3.6, 4.6→4.6). The self-anchor floor is therefore
**scatter** — sensor noise, demosaic, per-chip metamerism — not a correctable
linear transform. A fitted profile is just a worse substitute for good WB
(the neutral's 3.6 beats the matrix's 5.8). Adobe's DCP tables would likely
be no different here (and the phone DNG already carries the manufacturer
matrix we apply); their nonlinear `HueSatMap` could matter only if real soil
shows **per-hue structured** error, which the chart's narrow gamut can't
show. Levers for the floor stay: in-scene neutral WB, don't clip, and
**burst-average to cut noise**. Caveat: single global matrix on a narrow
gamut — a per-illuminant matrix or a wider color target could differ.
