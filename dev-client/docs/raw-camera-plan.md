# RAW camera capture for soil-color analysis — implementation plan

## Motivation

The soil-color pipeline (`src/screens/ColorAnalysisScreen/`,
`src/model/color/colorDetection.ts`) currently captures a JPEG via
`expo-image-picker`, then applies a per-channel white-balance correction
against an in-frame reference card and converts the result to Munsell.

Two problems live in that pipeline:

1. **Gamma bug (easy to fix).** The correction runs against sRGB-encoded
   values, not linear-light. A per-channel gain is only physically correct
   in linear space; in sRGB it under- or over-corrects. Straightforward
   fix in JS, no new dependencies.
2. **White balance and tone mapping baked into the JPEG (hard to fix
   correctly without RAW).** Auto white balance is content-aware and
   partially unrecoverable from the JPEG. Tone mapping is non-linear,
   scene-adaptive, and often region-adaptive (Smart HDR / Deep Fusion).
   The in-frame reference card partially compensates for WB but cannot
   undo the tone-map's non-linearity — the card and the soil sample land
   on different slopes of the S-curve and get systematically miscorrected.

RAW capture bypasses both by giving us data before the ISP applies WB and
tone mapping. This document plans the client work to add RAW capture as
an optional path, gracefully falling back to JPEG on devices that don't
support RAW.

## Architecture decisions

### Reusable, not soil-specific

Even though soil-color analysis is the only initial consumer, the
capture surface lives in `src/components/inputs/image/` alongside
`ImagePicker.tsx` and stays screen-agnostic. Future consumers (site
photos, other analysis flows) just import the same components and pass
their own callbacks. Only the ROI-selection and reference-card UI stays
inside `ColorAnalysisScreen`.

Files:

- `src/components/inputs/image/RawCameraView.tsx` — general-purpose
  camera view + shutter/viewfinder/focus/cancel UI. Configurable
  capture settings via props.
- `src/components/inputs/image/useRawOrJpegCapture.ts` — hook that
  probes for RAW support and returns a `capture()` function whose
  result is a discriminated union (`kind: 'raw' | 'jpeg'`).
- Native module — one `decodeDngRois(dngPath, [rois]) → linear RGB
  triples` implementation per platform, but the *algorithm* is the
  same on both (see next section).

### ~~Uniform Bayer DNG on both platforms~~ — Per-platform decode after all

**Original decision (kept for historical context):** ask for plain Bayer
DNG on both platforms, do one bilinear-demosaic pipeline in C++ that
runs on iOS and Android alike. Reasoning was:

| Argument | Verdict |
|---|---|
| We must write the Bayer demosaic for Android regardless | Running it on iOS is free once written |
| ProRAW's more sophisticated demosaic is better than bilinear | **Irrelevant.** We average 100×100 ROIs of near-uniform color; the averaging step is a low-pass filter that erases any demosaic-algorithm difference |
| Apple ISP does demosaic on dedicated hardware — much faster | Irrelevant — bilinear demosaic of 10 000 pixels is <1 ms on any CPU. Once per capture, not per frame |
| ProRAW file size | **Bayer wins.** ProRAW DNGs are 25–75 MB; plain Bayer ~10–15 MB |
| Apple's ProRAW processing (WB, partial tone curve) can change between iOS versions | Plain Bayer removes that variable — closer to true raw sensor data |
| One code path to test and maintain | **Big win** |

**Reversed during phase 3** after empirical testing on iPhone 15 Pro
Max showed the 48 MP quad-Bayer sensor **does not expose plain Bayer
on any AVCaptureDevice.Format**, at any resolution, whether ProRAW is
enabled or not. Every `availableRawPhotoPixelFormatTypes` query on
every format either returned an empty array or a single Apple ProRAW
entry. Consistent with Apple's WWDC21 guidance that Bayer RAW is
single-camera-only, and — apparently new since iPhone 15 Pro — Apple
has retired non-ProRAW paths on the flagship quad-Bayer sensors.

**Current decision — per-platform decode paths:**

| Platform | Container | Decoder |
|---|---|---|
| **Android** (CameraX) | Plain Bayer DNG at sensor-native resolution | Our C++ engine (`modules/dng-decoder/cpp/`) |
| **iOS** (older Pro, non-Pro if they get RAW) | Plain Bayer DNG if OS exposes it | Same C++ engine |
| **iOS 15 Pro Max & modern Pro** | Apple ProRAW LinearRaw DNG (lossless-JPEG + tiled) | **`CIRAWFilter`** (Apple's built-in RAW decoder) |

Only the file→linear-RGB step is platform-specific. Everything
downstream (`AsShotNeutral` WB divide → `ColorMatrix1` XYZ transform →
Munsell match) stays shared code — the two decoders converge on the
same `LinearRgb` triple output type.

**What we give up by accepting ProRAW on iOS:**

- **Deep Fusion / Smart HDR / Night Mode are baked into the pixel
  data** and cannot be inverted post-capture, only opted out of at
  capture time (which we can't do via vision-camera).
- **Apple's tone curve** is stored as `ProfileToneCurve` and could in
  principle be inverted, but for now we accept it. `CIRAWFilter`'s
  `boostAmount=0` + related zeroed settings get us "as close to linear
  as Apple lets us" without a manual inversion pass.
- **Bigger file size** (20+ MB for a 12 MP ProRAW vs the ~10 MB we'd
  have gotten with plain Bayer). Not a real problem — we share once,
  they're temp files.

**What we get back that would have been hard to build ourselves:**

- Handling of ProRAW's **lossless-JPEG compression** (Compression=7).
  Our custom parser rejects anything but Compression=1; adding
  libjpeg or a hand-rolled decoder would be 500–1000 lines of code.
- **Tiled layout parsing** (Compression=7 ProRAW is always tiled;
  our parser only handles strips).
- **10-bit sample unpacking** across arbitrary tile boundaries.
- **Apple's own tone-curve inversion** — arguably more correct on
  Apple's files than any third-party attempt.

Trade-off: **two decoder implementations to maintain, but only one
color pipeline downstream.**

## Library choice

**`react-native-vision-camera` v5.1.1** is the only real option. Others
ruled out: `expo-camera` (JPG/PNG only, no DNG), `react-native-camera-kit`
(no DNG in the API), `react-native-camera` (deprecated).

Key facts from the v5 source:

- `PhotoContainerFormat = 'jpeg' | 'heic' | 'dng' | 'tiff' | ...`
- Configure via `usePhotoOutput({ containerFormat: 'dng', ... })`
- Returned `Photo` object exposes `isRawPhoto`, `containerFormat`,
  `saveToTemporaryFileAsync()`, `getPixelBuffer()`.
- On iOS, vision-camera auto-selects ProRAW when supported (we'll
  explicitly opt out — see above).
- On Android, always Bayer. Runtime-gate on `RAW` in
  `CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES`.
- Peer deps: `react-native-nitro-modules`, `react-native-nitro-image`.
- No `supportedPhotoContainerFormats` device-introspection API yet
  (source has a TODO for it). Detection today: `isSessionConfigSupported`
  or check `photo.isRawPhoto` on the first capture.
- Coexists cleanly with `expo-image-picker` — different code paths
  (custom camera UI vs. OS picker), no known conflict.

Coexistence rule: `expo-image-picker` continues to own site photos,
welcome-screen shots, and every non-color-analysis photo flow. Only
`ColorAnalysisScreen`'s camera-capture path routes through
`RawCameraView`.

## RAW → linear RGB pipeline

For each captured DNG, we want linear-light RGB triples for the two
ROIs (reference card, soil sample). The **file→triple** step differs
per platform now; the downstream steps (WB, color matrix, Munsell
match) are shared.

### Android + older iOS Pro path (custom C++ engine)

Applies to plain-Bayer DNGs — CameraX on Android, and any iOS device
where the OS still exposes plain Bayer via
`availableRawPhotoPixelFormatTypes`.

1. Parse the DNG (minimal in-house TIFF parser for the tags we need:
   `CFAPattern`, `BlackLevel`, `WhiteLevel`, `ColorMatrix1/2`,
   `AsShotNeutral`, image dimensions, strip offsets).
2. Extract the Bayer patches for the requested ROIs (with a small
   margin — ROIs land on the Bayer grid, need padding for demosaic
   neighbourhood).
3. Bilinear-demosaic those ROI patches only (not the full image).
4. Apply black-level subtraction and normalize by white-level →
   `[0..1]` linear sensor RGB.
5. Apply the DNG-provided color matrix + WB gains from `AsShotNeutral`
   → linear XYZ or linear sRGB.
6. Return `{r, g, b}` linear triples to JS.

**~600 lines of focused C++**, small binary size. Handles CFA-mosaic
(32803) and — via a LinearRaw branch — 3-samples-per-pixel demosaiced
DNGs (34892) with `Compression=1` (uncompressed strips). LinearRaw
support is unused in practice since modern iPhone Pro ProRAW is
lossless-JPEG compressed and tiled, but the branch is defensive.

### iOS ProRAW path (Apple's `CIRAWFilter`)

Applies to iPhone 15 Pro Max and — presumably — other modern iPhone
Pro devices where plain Bayer is unavailable.

1. Load the DNG via `CIRAWFilter(imageURL:)`.
2. Zero out the boost knobs (`boostAmount`, `boostShadowAmount`) to
   get output as close to linear as Apple's typed API allows.
3. Render the `outputImage` into a `linearSRGB` color-space bitmap
   via `CIContext.render()`.
4. For each ROI, crop → `CIAreaAverage` → render 1×1 float RGBA →
   convert to `LinearRgb`.

`CIRAWFilter` handles ProRAW's compressed lossless-JPEG payload,
504×504 tile assembly, 10-bit sample unpacking, and Apple's own tone
curve inversion (as much as `boostAmount=0` triggers) internally. The
downstream color pipeline consumes the resulting `LinearRgb` triple
identically to the C++ engine's output.

**~50 lines of Swift**, uses only the built-in `CoreImage` framework
(no new pod dependencies).

### Rejected / historical alternatives

- **LibRaw**: LGPL-2.1 (compatible with our AGPL), mature. ~10 MB
  compiled — overkill for our narrow ROI-averaging need. Also fully
  redundant with `CIRAWFilter` on iOS.
- **dcraw**: public domain, single file, well-understood. Unmaintained
  since 2018.
- ~~**iOS `CIRAWFilter`**: gives us Apple's demosaic on iOS but forces
  a two-implementation split. Rejected in favor of uniformity.~~ —
  **reversed in phase 3.** The custom C++ path can't handle Apple
  ProRAW's lossless-JPEG + tiled layout without a large expansion
  (libjpeg or hand-rolled decoder + tile assembly = 500–1000 more
  lines of C++). `CIRAWFilter` gets us that decoding for free, plus
  Apple's own tone-curve knowledge. The split-implementation cost is
  smaller than the alternative cost.
- **JS/WASM demosaic**: LibRaw compiled to WASM exists but startup +
  memory cost is worse than a native module in an app already shipping
  native code.

Integration surface: vision-camera v5 is built on Nitro
(`react-native-nitro-modules`). Natural fit is a Nitro-based native
module — one interface, per-platform implementation files (Swift for
iOS's `CIRAWFilter` path, Kotlin+JNI for Android's C++ path).

## Component API sketch

```ts
// src/components/inputs/image/useRawOrJpegCapture.ts
export function useRawOrJpegCapture(): {
  isRawAvailable: boolean;
  capture(): Promise<CaptureResult>;
};

export type CaptureResult =
  | {
      kind: 'raw';
      dngPath: string;
      width: number;
      height: number;
      /** Decode a rectangular ROI to linear-light RGB. */
      decodeRoi(roi: {x: number; y: number; w: number; h: number}): Promise<{
        r: number;
        g: number;
        b: number;
      }>;
      dispose(): void;   // release DNG file + native buffers
    }
  | {
      kind: 'jpeg';
      photo: Photo;      // matches current PhotoWithBase64 shape
    };
```

Fallback path produces the exact object shape the current
`colorDetection.ts` pipeline consumes → zero downstream changes for the
JPEG case. RAW path bypasses `correctSampleRGB` entirely (we're already
in linear-light) and feeds triples to a new `getColorFromLinearRgb()`.

## Phased delivery

| # | Scope | Est. | Status |
|---|---|---|---|
| **0** | Compat spike: `react-native-vision-camera` v5 + Nitro peer-deps install cleanly; forcing plain Bayer on a ProRAW iPhone is possible | 1–2h | ✅ done. Deps installed; ProRAW opt-out achieved via `patches/react-native-vision-camera+5.1.1.patch`. **Ballooned into a full Expo SDK 54 → 56 hop** (RN 0.81.5 → 0.85.3) because vision-camera v5 requires RN 0.85+. Shipped as PRs #3324 (54→55) and #3325 (55→56). |
| **1** | Fix sRGB → linear gamma bug in `correctSampleRGB` | 0.5 day | ✅ done — PR #3327 (`fix/wb-correction-linear`). |
| **2** | `RawCameraView` + `useRawOrJpegCapture` + `RawImagePicker` + `RawPickImageButton` in `src/components/inputs/image/`. Vision-camera integration, custom shutter UI. Still requesting JPEG. Wire `ColorScreen` through it | 1–1.5 days | ✅ done — PR #3328 (`feat/raw-camera`). `useRawOrJpegCapture` currently returns `isRawAvailable: false` unconditionally — real detection lands in phase 4. |
| **3** | Nitro native module `decodeDngRois`: bilinear demosaic + color-matrix in C++ (Android + older iOS Pro plain-Bayer path), **plus CIRAWFilter path for iOS ProRAW**. Both converge on the same `LinearRgb` output. | 3–4 days | 🔄 in progress — both paths shipped on `feat/raw-dng-decoder` (PR #3331, draft). iOS ProRAW path validated end-to-end via `DngDecoder: ROI…→ linear sRGB` log in the dev capture flow. Android path not yet validated on device (needs Pixel 6a). Task #42 (Jest test) still open — needs a plain-Bayer DNG fixture. |
| ~~**4**~~ | ~~Flip `RawCameraView` to request `containerFormat: 'dng'` when device supports it. Fill in real `isRawAvailable` detection in `useRawOrJpegCapture`. Feed decoded linear RGB into new `getColorFromLinearRgb()`. Runtime-gate on RAW support (both platforms). JPEG fallback path unchanged~~ | ~~0.5–1 day~~ | ⤵ **absorbed into 5.1** — the same work, but scoped to the experimental screen only rather than modifying production `ColorScreen`. |
| **5** | Duplicate ColorScreen into a **dev-only experimental copy**; add settings-level toggle to route between production and experimental; add in-screen capture-pipeline selector (RAW / JPEG); manual ROI picker + full RAW pipeline; multiple reference cards + confidence picker. See sections below. | ~3–4 days | 🔄 5.0 (duplicate), 5.1 (selector), 5.2 (getColorFromLinearRgb + fixed ROIs), 5.3a (dispatch to Redux), and 5.3b (manual ROI picker + iOS preview) shipped on `feat/color-analysis-experimental` (PR #3332). Still pending: 5.4 (Android preview), and the multi-reference confidence picker (originally 5.2, now bumped). |
| **6** | Calibrate-a-new-reference dev flow. See section below. | ~1 day | ⏳ after phase 5. |

Each phase ships as an independent PR.

**Phase 3 debugging aid (not a gate):** if the decoder's linear-RGB
output looks wrong, capture a photo of a known reference (white sheet
under measured light, or the reference card framed alone) and check the
output is roughly the expected values. If it isn't, use LibRaw or
`dcraw` on the same DNG on a laptop to get ground-truth per-stage values
(post-black-level, post-demosaic, post-color-matrix) and isolate which
stage of the decoder is wrong. Not needed if the end-to-end Munsell
match is sane on the first real capture.

## Phase 5 — experimental ColorScreen with capture-pipeline toggle + reference-card picker

**Goal.** Iterate freely on the color-analysis UX without any risk to
the production `ColorScreen` that real users see. Duplicate the whole
screen first; add a settings-level toggle to route between them; then
on the experimental copy add (a) an in-screen selector for RAW-vs-JPEG
capture path, and (b) the multiple reference cards + confidence
picker. What was originally phase 4 (wire `getColorFromLinearRgb`,
runtime-detect RAW support, etc.) folds into 5.1 since we now do it
inside the experimental screen instead of modifying the production one.

Branch: `feat/color-analysis-experimental`, stacked on top of
`feat/raw-dng-decoder`.

### 5.0 — duplicate the screen, add settings toggle

**Duplicate.** Byte-for-byte copy of `src/screens/SoilScreen/ColorScreen/`
into `.../ColorScreenExperimental/`. Rename each component:
`ColorScreen` → `ColorScreenExperimental`, `CameraWorkflow` →
`CameraWorkflowExperimental`, etc. Update the internal imports so the
copy is self-contained (no shared components that could cause
production drift by accident). No behavior change yet.

**Route toggle.** New MMKV boolean `useExperimentalColorScreen` (default
false). New settings row under `FF_testing` — radio "Color Analysis:
Production / Experimental". In `screenDefinitions.tsx` or wherever the
color route is registered, read the flag at nav-time and dispatch to
the corresponding component.

**Ship as its own commit** — after this commit and before any further
work, both screens are identical; anything can be reverted safely.

### 5.1 — in-screen capture-pipeline selector

Add a top-of-screen selector to `ColorScreenExperimental` for the
capture pipeline. This is separate from the settings-level
production/experimental switch — it lets the tester compare RAW vs
JPEG on the *same* experimental analysis code.

Two options for now:

- **"RAW capture"** — routes through `useRawOrJpegCapture` returning
  `{kind: 'raw', dngPath, decodeRoi}`. On supported devices,
  `RawCameraView` captures a DNG (ProRAW on modern iPhone Pro, plain
  Bayer on Android + older iOS Pros). Downstream: skip
  `correctSampleRGB` (already in linear-light after color-matrix
  transform), feed decoded triples into a new
  `getColorFromLinearRgb()` in `src/model/color/`.
- **"JPEG capture (current path)"** — the classic path that production
  uses today: `expo-image-picker` → JPEG → existing
  `correctSampleRGB` → Munsell match. Unchanged; the experimental
  screen just wires it in as one of the two options.

The selector state lives in MMKV so it survives reloads (nice for
back-to-back capture comparisons). Gate the RAW option behind
`useRawOrJpegCapture().isRawAvailable` — grey out with a "Not
available on this device" tooltip when detection returns false.

**What was phase 4 rolls in here:**
- Real `isRawAvailable` detection in `useRawOrJpegCapture`
- The `getColorFromLinearRgb` implementation
- ROI coordinate transform from preview-frame → raw-sensor
  coordinates (still non-trivial; see phase 4 discussion above)

### 5.2 — multiple reference cards + confidence-based picker

Once 5.0 and 5.1 land and the RAW path is producing sensible triples,
add the reference-card picker on the experimental screen.

**Data model.** New file `src/model/color/references.ts`:

```ts
type ReferenceCard = {
  id: string;
  name: string;                            // human-facing, e.g. "3M Post-it Yellow"
  expectedLinearSrgb: {r: number; g: number; b: number};
  calibratedUnder?: string;                // free-text illuminant note (phase 6 populates)
};
export const REFERENCES: ReferenceCard[] = [
  { id: 'postit-yellow-3m', name: '3M Post-it Yellow',
    expectedLinearSrgb: {r: 0.85, g: 0.72, b: 0.15} },
  // add more here
];
```

Editing the source is acceptable for phase 5. No backend/DB.

**Match scoring.** Use `delta-e` (already a dep) — convert both
`measured` (from decoder) and each `expected` to LAB, compute ΔE00.
`confidence = clamp(1 - ΔE / 40, 0, 1)`. 40 as a "definitely different
color" threshold is a starting heuristic; tune once we have data.

**"Expected color" — is that enough?** For phase 5, yes: after RAW+WB
the measured triple is in linear-sRGB, so a per-reference linear-sRGB
target is the minimum required to compute ΔE. Phase 6 may want more
(illuminant-tagged variants) — see below.

**UX.** A plain `<Text>` list under `ColorScreen` post-capture: name
plus confidence bar or score, sorted descending, top row auto-selected
via radio. Override allowed. No new i18n keys — English literals fine
for a temporary UI.

### 5.3 — manual ROI picker + Redux dispatch (shipped)

Landed in two commits on `feat/color-analysis-experimental`:

- **5.3a** — dispatch the Munsell match from `getColorFromLinearRgb` to
  Redux via `updateDepthDependentSoilData`, matching the JPEG path.
  Result persists across navigation/session/sync; Manual view
  auto-populates. Falls back to nearest-soil-color when the predicted
  color is out of soil-color range (JPEG path pops a confirmation
  dialog; experimental keeps it flat to avoid extra modals).
- **5.3b** — new `RawColorAnalysisScreen`. On mount calls
  `DngDecoderHybrid.renderPreview` (new Nitro method — iOS
  CIRAWFilter → PNG file, Android throws not-implemented for now).
  Preview shown at screen width with correct aspect ratio; two
  draggable colored rectangles (RED for reference card, BLUE for
  soil sample) overlay via `PanResponder`. Analyze scales
  display-coord ROIs to sensor coords, decodes both via
  `decodeDngRois`, runs `getColorFromLinearRgb`, dispatches, pops.
  Rectangle size is fixed (50% × 20% of preview) — resize handles
  are future work.

### 5.4 — Android `renderPreview` implementation

`DngDecoderHybrid.renderPreview` currently throws not-implemented on
Android — the ROI-picker screen surfaces this as "Could not load
preview." Fixing this unblocks Pixel 6a (and any Android device with
CameraX RAW capability) testing on the experimental RAW path.

**Approach.** Sub-sampled demosaic in C++ → hand raw RGBA bytes to
Kotlin → Kotlin builds a Bitmap + writes PNG via
`Bitmap.compress(Bitmap.CompressFormat.PNG, ...)`. Clean division:
C++ knows the DNG layout and does the color science; Kotlin knows
the Android Bitmap API and does file I/O.

- **Why sub-sampled and not full-res demosaic:** a 3024×4032 12 MP
  DNG needs 12M output pixels. Even at ~1 µs each, that's 12 s.
  Sub-sampling to fit `maxDim = 1200` gives us ~1 M output pixels —
  sub-second on any Android worth running the app on.
- **Why not PNG-encode in C++:** would need libpng or stb_image_write
  vendored in, adding a whole dependency for something Kotlin does
  in one method call. Not worth it.

**Concrete pieces:**

1. **C++ engine** — new `renderPreviewRgba(dng, maxDim) → {width,
   height, rgba: vector<uint8_t>}` in `DngPipeline.hpp/cpp` (~120 lines).
   For each output pixel: map back to sensor coords, sample the
   enclosing 2×2 Bayer block (nearest-neighbor demosaic — fast, plenty
   good enough for a preview), apply black-level + `AsShotNeutral` WB +
   `ColorMatrix1` (sensor → XYZ → sRGB) + gamma encoding, pack ARGB.
   Handles the LinearRaw layout too (skip demosaic, read 3 samples
   directly).
2. **C bridge** — `dngDecoderRenderPreviewRgba(path, maxDim,
   outWidth, outHeight, outBytes, outByteCount, errorOut)` plus a
   `dngDecoderFreePreview(bytes)` to release the buffer (~20 lines).
3. **JNI bridge** — mirror the pattern already used for
   `nativeDecodeRois` (~40 lines). Return the buffer as a direct
   `ByteBuffer` or copy into a Java `byte[]`.
4. **Kotlin `renderPreview`** — allocate a `Bitmap` with
   `Config.ARGB_8888` at the returned dimensions, `copyPixelsFromBuffer`
   from the native RGBA, `compress` to a PNG file in `cacheDir`,
   `bitmap.recycle()`, return `PreviewImage` (~50 lines).

**Total scope:** ~230 lines, roughly 3 hours of C++/JNI/Kotlin plus
Android-device testing.

**Risks / gotchas:**

- **Orientation.** CameraX writes DNGs in device-native orientation
  with an EXIF Orientation tag (274). Our C++ parser doesn't
  currently read that tag. Preview may render sideways relative to
  what the user shot. Fix: parse the tag in `DngParser`, apply the
  rotation in `renderPreviewRgba`.
- **Bitmap byte order.** Android's `ARGB_8888` bit-packs differently
  depending on how you fill it. `copyPixelsFromBuffer` expects the
  native-endian representation — needs a quick test to confirm we're
  writing bytes in the order Android expects.
- **Memory pressure.** ~7 MB RGBA buffer allocated native-side, held
  briefly during compression. Small on any modern Android but worth
  freeing eagerly (both the C++ buffer via `dngDecoderFreePreview` and
  the Bitmap via `.recycle()` after PNG write).

**Cache by DNG mtime (small polish, folded into 5.4 or a follow-up).**
Both iOS and Android currently redo the full render on every call to
`renderPreview` — wasteful if the user navigates into and back out of
the analysis screen. Add a deterministic output path
(`tmpDir/dng-preview-<hash(dngPath)>-<maxDim>.png`), and before
rendering check:

```
if fileExists(outPath) && mtime(outPath) >= mtime(dngPath) {
  return existing PreviewImage
}
```

Belt-and-suspenders: existence check alone is sufficient for our
use case (each capture gets a UUID-based path — no reuse), but mtime
adds resilience against corrupt half-written cache files and any
future path-reuse. ~5 lines each on iOS and Android. Symmetric across
platforms; ship as one small commit after Android renderPreview lands.

**After 5.4 ships:**

- Android RAW capture becomes feature-complete on the experimental
  screen — same downstream code path as iOS.
- Direct comparison possible: iOS ProRAW (Apple's decoder) vs.
  Android plain-Bayer (our C++ decoder) on the same scene. This is
  the "true RAW" validation the original plan discussed — Apple's
  computationally-enhanced RAW vs. our from-scratch decoder.

## Phase 6 — calibrate a new reference

**Goal.** Given a scene with a known (already-in-`REFERENCES`)
reference AND a new uncalibrated card, compute the new card's
`expectedLinearSrgb` and print it for the user to paste into the
array from phase 5.

**Flow.** Dev-only screen under Settings, alongside the fixture-capture
entry:

1. Camera captures DNG (single-cam wide-angle, as in phase 3).
2. User selects two ROIs — known-reference and new-reference.
3. Decode both via `decodeDngRois`.
4. Per channel, `gain = expected_known / measured_known`.
5. `expected_new = measured_new * gain`.
6. Display `{r, g, b}` and a copy-pastable code snippet for
   `REFERENCES`.

**Do we need multiple lighting conditions?** Sometimes yes. Dye-based
targets (post-its, printer paper, most stickers) have narrow spectral
peaks — their linear-sRGB after per-channel WB is not illuminant-
invariant (metameric failure). Soil is broadband, so soil samples are
less affected; the *references* are the worst offenders.

**Phase 6 v1: single-illuminant calibration.** Store the illuminant
used (freeform text from the user: "kitchen daylight ~4pm cloudy") in
`calibratedUnder`. Phase 5 can later warn when using a reference under
a very different illuminant than its calibration.

**Deferred (phase 6.1 / later):** multi-illuminant calibration —
capture the same reference under 2–3 illuminants, store per-illuminant
expected colors, at capture-time pick the entry whose illuminant is
closest to the current scene's (as inferred from the reference itself).
Higher effort, higher accuracy. Only worth it if phase 5's ΔE numbers
suggest illuminant drift is dominating error.

**Later (backend, out of scope):** move `REFERENCES` server-side so
users can share calibrations. Needs migration path from the source-
edited array. Punt.

## Deferred / low priority

- **Load a RAW file from the photo library.** The current UX lets the
  user pick a JPEG from the library via `expo-image-picker`, but that
  code path likely won't return DNGs even where the library holds them
  (iOS Photos does expose RAW via `PHAssetResource` but `expo-image-picker`
  doesn't surface it). Post-phase-4, revisit whether to add a
  "pick RAW from library" entry that routes through the same
  `decodeDngRois` pipeline as fresh captures. Low priority — the
  primary flow is capture, not library selection.

## Risks flagged

- ~~**Vision-camera v5 is a new Nitro-based rewrite.**~~ Resolved by
  phase 0. Cost was higher than expected — vision-camera v5 requires
  RN 0.85+, which forced the Expo SDK 54 → 55 → 56 upgrade sequence
  (PRs #3324, #3325) before phase 2 could start. Once past that,
  vision-camera itself installed cleanly.
- ~~**Modern iPhone Pros expose plain Bayer** — the plan assumed we
  could always force plain Bayer via `isAppleProRAWEnabled = false`.~~
  **Wrong on iPhone 15 Pro Max and probably later Pros.** The 48 MP
  quad-Bayer sensor architecture exposes no plain-Bayer format via
  `availableRawPhotoPixelFormatTypes` at all, on any active format,
  regardless of the ProRAW toggle. Discovered empirically in phase 3
  via a full-format probe patch. Resolution: accept ProRAW on iOS,
  use `CIRAWFilter` for decoding — see the pipeline section above.
- **No `supportedPhotoContainerFormats` device-introspection API yet**
  in v5 (TODO in source). Runtime detection is uglier —
  `isSessionConfigSupported` or check `photo.isRawPhoto` after first
  capture attempt. Deferred to phase 4.
- **Custom camera UI is real work.** Vision-camera gives us the
  camera surface, not the shutter button + focus reticle + orientation
  lock. Budget ~1 day inside phase 2.
- **Android RAW frame memory pressure** (~20–30 MB per Bayer frame).
  Single-shot capture is fine; don't hold multiples; dispose native
  buffers eagerly.
- **Android RAW device coverage is uneven** — Pixels yes, most
  Samsung/OnePlus flagships yes, mid-range and older devices often no.
  Expected — fallback handles it.
- **Scope discipline** — only `ColorAnalysisScreen` uses the new
  capture path initially. All other photo flows stay on
  `expo-image-picker`.
