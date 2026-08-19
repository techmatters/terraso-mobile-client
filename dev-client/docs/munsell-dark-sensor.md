# Making RAW work better for serious soil-color measurement

The Munsell Chart Validator app is intended for serious agronomic
soil-color measurement, not casual "what colour is this dirt" use.
For that scale of accuracy, RAW is the honest data source (see
"RAW vs JPEG" below), but current RAW analyses have a systematic
noise problem in dim conditions. This doc captures the findings and
enumerates concrete options to fix them, ordered by leverage.

## Two use cases

This app has two overlapping-but-distinct capture paths, and it's
worth calling them out because some of the options below apply to
one path more than the other.

1. **Internal development & testing (Munsell-chart shots).**
   Used to develop and validate settings, algorithms, and
   calibration data. Many chips visible per shot; cross-chip
   consistency is the primary metric; ΔE against the Munsell
   notation acts as ground truth.
2. **Field use (soil + reference card).** The end-user path.
   Soil patch plus 1–2 reference cards (colorchecker or similar)
   in frame; no Munsell chips visible. The reference cards drive
   white balance; the soil-patch measurement is the output.

How each option below maps to the two paths:

- Two-ref WB (#1) is *naturally satisfied* in the field path if we
  require two reference regions on the card; it's an app-side
  change for the Munsell-development path.
- Signal-strength check at capture (#2) is a **universal
  precondition** — refuse to accept dim shots in either path.
- Multi-shot averaging (#3), capture-time exposure + motion
  detection (#4), lighting guidance (#5), light-box accessory (#6),
  per-device calibration (#7), and everything downstream benefit
  both paths equally.
- Chart-anchor alignment for multi-shot uses different reference
  features per path (Munsell chart edges vs ref-card corners) but
  the technique is identical.

## The problem

In our fixture batch, Pixel 7 (and to a lesser extent Pixel 4) shots
consistently produce noisier per-chip ΔE than iPhone shots, especially
at low signal. The pattern is most visible in the channels-chart
heatmap: **mean ΔE 12+ at signal < 0.05, dropping to 6–8 at signal
0.10–0.15**. The iPhone counterparts land around 3–5 ΔE across the
same signal range.

A representative case: `5R_multi_BOTH_ANDROID_20260812T140705` on
Pixel 7. Registration was fine, chart geometry OK, but the sensor's
red channel effectively saw a flat ~0.09 raw reading across all
value-5 chips despite their true expected R spanning 0.22 → 0.47
(2× dynamic range). The red channel was under-exposed enough that
noise dominated the actual chip content. Post-WB with a big red-gain
multiplier (roughly 4×), that flat 0.09 becomes an equally-flat 0.4,
which gets aggregated as a big cross-chip ΔE.

Signal-strength as `min(R, G, B) of greycard raw` captured this well:
below 0.10 the per-chip measurements are dominated by shot noise
rather than signal.

## Why JPEG *looks* better even though RAW is more honest

A brief note in case anyone comes back to this and is tempted to
switch the app to JPEG for "better numbers":

1. **JPEG's tone curve happens to align with Munsell perceptual
   uniformity.** Both are logarithmic-ish; both lift shadow midtones.
   ΔE (in perceptual Lab space) rewards this cancellation. Not
   because JPEG is *measuring* better — because its stylistic tone
   curve coincidentally matches what Munsell was designed for.
2. **Denoising reduces per-cell variance** legitimately, ~15% of the
   observed improvement.
3. **Region-specific WB is *not* a big deal** on chart shots (no
   faces / skies for the ISP's region logic to grip).

But JPEG has failure modes that raw doesn't. Example: on Pixel 4
and iPhone, the JPEG pipeline crushes the `10B 2.5/1` chip to
near-black (`Y ≈ 0.008`); on Pixel 7 it preserves it (`Y ≈ 0.048`);
raw across all three devices gives consistent values in the
`Y ≈ 0.03–0.08` range. **Same physical chip, three different
JPEG results.** For scientific measurement that's disqualifying.
Stick with RAW.

## Options to make RAW better

### Immediate wins (days each, no hardware)

**1. Two-ref (gain + offset) WB in the app.**  
The single-ref WB currently in the app forces `measured = raw × gain`
per channel — 1 parameter, must pass through origin. Any residual
sensor offset (dark-current, stray light, decoder rounding) survives
uncorrected and gets amplified by the gain. A two-ref fit
`measured = raw × gain + offset` uses two known (raw, expected)
points per channel to solve for both parameters, absorbing whatever
residual offset the sensor has.

Validated in the filmstrip: on the Pixel 7 5R case above, mean ΔE
dropped from 12+ to <8 just by adding paper (from the whitemask
border ring) or postit as a second anchor alongside greycard. Same
physical setup, same photos, better math. The `computeWB()` /
`applyWB()` helpers in `scripts/render-munsell-error.ts` already do
this — port that logic to the app's real-time analysis path.

Cost: ~1 day of app work + testing. Biggest per-shot improvement.

**2. Signal-strength check at capture time.**  
Compute `min(greycard raw R, G, B)` from the just-taken frame. If
below ~0.10, don't accept the shot — surface a modal like:
*"Not enough light — try a brighter or more direct illumination."*
Optionally offer a one-tap retry with bumped exposure. Prevents the
"dark shot → bad measurement" failure at capture time.

In the field path, the equivalent is `min(ref-card white-patch raw R,
G, B)` — same idea, different reference region.

Cost: ~half-day.

**3. Multi-shot averaging (Android only).**  
Capture N (3–5) rapid frames, average per-cell linear-sRGB
post-decode. Shot noise is Poisson: √N reduction, so 5 frames →
~2.2× less noise. Not needed on iPhone — ProRAW already stacks
internally.

*Implementation:*
- **Capture side.** `ImageReader` with `maxImages ≥ N`,
  `format = ImageFormat.RAW_SENSOR`. **Lock exposure + WB before
  the burst** (`CONTROL_AE_LOCK = true`, `CONTROL_AWB_LOCK = true`)
  or the ISP re-computes between frames and averaging mixes
  inconsistent data. Fire N `captureBurst()` requests; sensor
  readout is 30–60 ms/frame at full res, so a 5-frame burst is
  ~150–300 ms of sensor time.
- **Processing side.** Decode each DNG through the existing
  `DngPipeline`, then average per-ROI (not per-pixel) in
  linear-sRGB. Averaging Bayer frames costs ~20 MB × N in RAM and
  demosaic can differ across frames anyway; averaging post-decode
  ROIs is essentially free (~1.5 MB total for 5 frames × 30 ROIs).
- **Peak memory.** One full-res decoded frame in flight (~150 MB
  float32 RGB at 12 MP) plus a running accumulator. Fine on 6+ GB
  Android; older 3 GB devices may struggle — fall back to
  ROI-only averaging if needed.
- **Wait time.** 1–2 s tap-to-result. Standard Night-Sight pattern;
  users expect a spinner and don't perceive it as slow.
- **Frame alignment.** If the phone moves between frames, averaging
  blurs. Two mitigations:
  - *Tripod-mode assumption* — skip alignment, works if user braces
    the phone against a surface.
  - *Chart-/card-anchor alignment* — we already detect chart or
    ref-card geometry per frame; align frame N+1 → frame 1 using
    detected center + rotation → resample → average. ~200 ms/frame
    extra CPU, robust to modest hand motion. Uses Munsell chart
    edges in the dev path, ref-card corners in the field path.
- **Outlier rejection.** Trimmed mean (drop highest + lowest per
  ROI, average middle 3 of 5) handles the "one frame caught a
  glint" case cleanly.

Cost: ~1 day for basic burst + averaging; +1 day for alignment.

**4. Capture-time exposure lift + motion detection.**  
Complementary tricks that address the "not enough photons" root
cause at capture time rather than compensating for it in post.

*(a) Exposure compensation +1 stop (Android).* Bump
`AE_EXPOSURE_COMPENSATION` by +1. Auto-exposure then picks a
slightly longer shutter and/or higher ISO. For most scenes it still
chooses safe handheld times (1/60s or 1/125s). Two lines of CameraX,
immediate ~2× signal boost. No UX changes.

*(b) IMU-based steady indicator.* Register a listener on
`SensorManager.SENSOR_TYPE_GYROSCOPE` at 200 Hz. Compute rolling
angular-velocity variance over a ~250 ms window. Show a
green/yellow/red steadiness meter in the viewfinder — standard pro
camera app UX. Rough thresholds: variance < 0.01 rad²/s = steady
enough for 1/30s; < 0.005 = steady enough for 1/15s. Also gates
option (d).

*(c) Post-capture blur check.* Apply a Laplacian filter to a small
preview crop; measure the variance of the result. Low variance =
blurry image (classical focus-quality metric). If below threshold,
reject with *"image was too blurry — try again."* 5–10 ms overhead,
catches bad captures before they pollute analysis regardless of
whether motion or focus caused the blur.

*(d) Force longer shutter conditional on IMU.* When IMU says the
phone is genuinely steady, force `SENSOR_EXPOSURE_TIME = 1/15s` (via
`CONTROL_AE_MODE = OFF`). Skip when the phone isn't steady. Biggest
signal boost of the four, but usable only for rock-steady captures.

Cost: (a) 2 lines. (b) ~50 lines + UI. (c) ~20 lines. (d) ~100
lines total when combined with (b). Ship in that order; each is
independently useful.

**5. Lighting guidance in the app.**  
Photography rules our users may not know:
- Aim for daylight through a diffuser, or a warm-white indoor lamp
  positioned to eliminate shadows on the chart.
- Avoid backlighting the chart (window behind it).
- Warm/full-spectrum sources (halogen, incandescent, daylight, or
  CRI-95+ LEDs) give better red-channel signal than cool 4000K
  fluorescents/LEDs.
- Get close-in so the chart fills the frame — more pixels per chip
  = better averaging.

Consider a **live signal-strength meter** overlay in the capture UI
so the user can adjust lighting until greycard signal is above
some threshold, before pressing shutter.

Cost: half-day for docs; ~1 day for the live meter.

**6. Light-box accessory.**  
The gold standard: sell (or recommend) a small folding light box
with a diffuser + battery-powered LED. Turns "hope for good
lighting" into "consistent 5500 K, CRI-95+, uniform illumination."
~$30–50 retail. Eliminates 80% of noise-related problems that
software can't fully compensate for.

Cost: hardware sourcing / partnership decision, not code work.

### Bigger investments (weeks each)

**7. Per-device calibration profile.**  
One-time setup process: user (or you, before shipping) shoots a
professional colorchecker under known illuminant. App fits a full
3×3 color transform + per-channel offset (12 parameters) specific
to that device model. Stored on device, applied to every subsequent
capture as the *first* pipeline step, before user-side WB.

This is what Adobe DNG profiles do. Would totally close the gap
between Pixel and iPhone accuracy, and generalize across illuminants
in a way that per-shot WB alone can't. The infrastructure already
exists to compute such profiles from our existing multi-fixture data.

Cost: 2–3 weeks (profile-fitting pipeline + app storage/apply +
one-time capture flow).

**8. Signal-linearization stage.**  
Characterize the sensor's non-linearity once via a step-wedge shot
(known-neutral chips at a range of L*). Build an inverse curve
that lifts dim signal, applied before the linear WB step. Sensors
tend to compress at both ends of their dynamic range; even a
first-order correction here helps the very-dark chips that most
suffer from noise + compression.

Cost: 1 week to characterize + validate.

**9. Local dark-frame subtraction.**  
Some phones don't fully compensate sensor bias in the DNG's stored
BlackLevel tag (which is a factory-static value, not the current
shot's actual noise floor). Shoot a dark frame (lens capped, same
ISO/shutter) once per session, subtract per-pixel. Impractical for
casual users; only useful in a controlled lab setting or an
"advanced mode."

Cost: 1 week to implement + workflow-design.

## Recommended path

If we can only ship 2 things:

1. **Two-ref WB in the app (#1)** — biggest per-shot improvement,
   uses infrastructure we already validated.
2. **Signal-strength check at capture (#2)** — prevents dark shots
   from ever reaching analysis in the first place.

Together those probably solve 80% of the noise-related complaints.

If we can add a third (Android specifically):

3. **Exposure compensation +1 stop from option #4(a)** — literally
   two lines of code, cuts the Pixel signal deficit roughly in half
   at capture time. Almost free; do it opportunistically alongside
   #1 or #2.

Everything else in this list is worth doing for the last 20%,
especially if the app becomes the standard tool for a specific
soil-lab workflow. The per-device calibration profile (#7) is the
single biggest ceiling raiser and would let us close the
Android-vs-iPhone accuracy gap that no per-shot correction can.

## Diagnostic follow-up worth doing separately

The Pixel 7 signal levels are systematically lower than iPhone
even in the same folder ("LIGHT BG"). We initially suspected a
raw-decoder quirk (e.g. missing AsShotNeutral application), but
verified by reading `modules/dng-decoder/cpp/DngPipeline.cpp:230–235`
that AsShotNeutral IS being applied. So the residual gap isn't a
decoder bug.

Best current theory: iPhone ProRAW is *computational raw* — Apple
stacks multiple frames + applies ISP transforms and writes the
result as a DNG (with `AsShotNeutral = [1, 1, 1]` because the
values are already normalized). Pixel DNG is *true raw* — a single
sensor read with only black-level subtracted. So the same "raw
DNG" file format encodes very different things depending on
manufacturer. This is why multi-shot averaging (#3) is Android-only
in the recommendation above: iPhone's stacking is already baked in.

If we want to confirm rather than infer: shoot the same physical
scene on Pixel 7 and iPhone side-by-side under controlled identical
lighting, then compare raw pixel values at each step of the decoder
pipeline (`raw sensor value` → `after black-level subtract`
→ `after AsShotNeutral` → `after ColorMatrix2` → final linear-sRGB).
About half a day of work; would put a number on the gap.
