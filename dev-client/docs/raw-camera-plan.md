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

### Uniform Bayer DNG on both platforms

Even on iPhone Pro devices that support Apple ProRAW, we ask for plain
Bayer DNG. Reasoning:

| Argument | Verdict |
|---|---|
| We must write the Bayer demosaic for Android regardless | Running it on iOS is free once written |
| ProRAW's more sophisticated demosaic is better than bilinear | **Irrelevant.** We average 100×100 ROIs of near-uniform color; the averaging step is a low-pass filter that erases any demosaic-algorithm difference |
| Apple ISP does demosaic on dedicated hardware — much faster | Irrelevant — bilinear demosaic of 10 000 pixels is <1 ms on any CPU. Once per capture, not per frame |
| ProRAW file size | **Bayer wins.** ProRAW DNGs are 25–75 MB; plain Bayer ~10–15 MB |
| Apple's ProRAW processing (WB, partial tone curve) can change between iOS versions | Plain Bayer removes that variable — closer to true raw sensor data |
| One code path to test and maintain | **Big win** |

Caveats to confirm in phase 0:

- Can `react-native-vision-camera` force plain Bayer on a ProRAW-capable
  device? Almost certainly yes — via disabling
  `AVCapturePhotoOutput.isAppleProRAWEnabled`. Verify the config surface
  we get from the JS side.
- Our demosaic must read the `CFAPattern` DNG tag rather than hardcoding
  RGGB — iPhone and Android sensors don't all use the same Bayer layout.
- iPhone-generated plain Bayer DNGs must be well-formed enough for our
  decoder. DNG is standardized, but "should" doesn't count until we've
  successfully decoded one.

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
ROIs (reference card, soil sample). Approach:

1. Parse the DNG (TIFF-based; use libtiff or a minimal in-house parser
   for the small set of tags we need: `CFAPattern`, `BlackLevel`,
   `WhiteLevel`, `ColorMatrix1/2`, `AsShotNeutral`, image dimensions,
   strip offsets).
2. Extract the Bayer patches for the requested ROIs (with a small
   margin — ROIs land on the Bayer grid, need padding for demosaic
   neighbourhood).
3. Bilinear-demosaic those ROI patches only (not the full image).
4. Apply black-level subtraction and normalize by white-level →
   `[0..1]` linear sensor RGB.
5. Apply the DNG-provided color matrix + WB gains from `AsShotNeutral`
   → linear XYZ or linear sRGB.
6. Return `{r, g, b}` linear triples to JS.

**~500 lines of focused C++**, small binary size, one algorithm to
test on both platforms.

Rejected alternatives:

- **LibRaw**: LGPL-2.1 (compatible with our AGPL), mature. ~10 MB
  compiled — overkill for our narrow ROI-averaging need. Consider as a
  prototype for correctness validation in phase 3 before committing to
  custom code.
- **dcraw**: public domain, single file, well-understood. Unmaintained
  since 2018.
- **iOS `CIRAWFilter`**: gives us Apple's demosaic on iOS but forces
  a two-implementation split. Rejected in favor of uniformity.
- **JS/WASM demosaic**: LibRaw compiled to WASM exists but startup +
  memory cost is worse than a native module in an app already shipping
  native code.

Integration surface: vision-camera v5 is built on Nitro
(`react-native-nitro-modules`). Natural fit is a Nitro-based native
module — one interface, per-platform implementation files.

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

| # | Scope | Est. |
|---|---|---|
| **0** | Compat spike: `react-native-vision-camera` v5 + RN 0.81.5 + Nitro peer-deps install cleanly; forcing plain Bayer on a ProRAW iPhone is possible from the JS side | 1–2h |
| **1** | Fix sRGB → linear gamma bug in `correctSampleRGB` (independent easy win, ships even if RAW work stalls) | 0.5 day |
| **2** | `RawCameraView` + `useRawOrJpegCapture` in `src/components/inputs/image/`. Vision-camera integration, custom shutter UI. Still requesting JPEG. Wire `ColorAnalysisScreen` through it | 1–1.5 days |
| **3** | Nitro native module `decodeDngRois`: bilinear demosaic + color-matrix in C++, reads CFA pattern from DNG metadata. **One module, one algorithm, both platforms.** | 3–4 days |
| **4** | Flip `RawCameraView` to request `containerFormat: 'dng'` when device supports it. Feed decoded linear RGB into new `getColorFromLinearRgb()`. Runtime-gate on RAW support (both platforms). JPEG fallback path unchanged | 0.5–1 day |

Each phase ships as an independent PR.

## Risks flagged

- **Vision-camera v5 is a new Nitro-based rewrite.** Phase 0 mitigates.
  If it doesn't play with our RN 0.81.5 + new-arch setup, we're back to
  research.
- **No `supportedPhotoContainerFormats` device-introspection API yet**
  in v5 (TODO in source). Runtime detection is uglier —
  `isSessionConfigSupported` or check `photo.isRawPhoto` after first
  capture attempt.
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
