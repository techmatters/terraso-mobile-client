# Part 2 — RAW capture, decode & color reduction: integration plan

Detailed plan for landing the RAW pipeline onto `fix/improved-color-determination`,
behind the experimental flag. Grounded in the **research branch code** (source of
truth); the research `docs/raw-camera-plan.md` is treated as secondary and possibly
stale — verify its claims against code when porting.

## Ground truth (what already exists in the research branch)

- **Capture is already built on both platforms** (not green-field):
  - Router `src/components/inputs/image/RawCameraView.tsx` + `captureTypes.ts`.
  - **iOS RAW:** `react-native-vision-camera` + a **ProRAW patch** (`patches/react-native-vision-camera+5.1.1.patch`).
  - **Android RAW:** the `raw-camera-android` Nitro module (vision-camera can't save `RAW_SENSOR` on Android).
  - JPEG (production): vision-camera.
- **Capture contract** (`captureTypes.ts`): `CaptureResult` is `{kind:'jpeg'|'raw'}`; the raw variant already exposes the **"get color from ROI" seam** — `decodeRoi(roi) => {r,g,b}` — plus `jpegPath?`, `width/height`, `renderPreview(maxDim)`, `dispose()`.
- **Decode core** (`modules/dng-decoder`, nitro API `DngDecoderHybrid`): `readMetadata`, `decodeDngRois`, `decodeDngRoisReduced` (returns per-ROI `{mean, dominant, variance}`), `renderPreview`, `readPreviewGrayscale`. Pure-C++17 engine shared across Android/iOS/Mac CLIs (see tracker "Native code / shared core").
- **JPEG companion:** iOS DNGs carry an embedded preview (always); Android "may need to generate" one. `renderPreview` is **iOS-only today** (Android throws) — verify.
- **Flag:** `experimentalColorScreenToggle.ts` (MMKV `useExperimentalColorScreen`, gated under `FF_testing`).
- **Storage today:** ad-hoc `expo-file-system` `cacheDirectory` writes; no managed retention.
- **Patches present:** vision-camera 5.1.1, react-native 0.85.3, rnmapbox, native-base.

## Requirements captured (from discussion)

1. One **temporary feature flag** enabling RAW **and** the new algorithms together.
2. DNG (+ JPEG if separate) written to a **temp dir** with **eviction** (placeholder: keep last ~10; design for age/size/free-space/count later). A **Settings upload section** (details later).
3. **Always fall back** to JPEG when RAW is unsupported (some Android *and* iOS devices).
4. **Extraction on all three platforms** (Android, iOS, Mac tooling) — core already shared.
5. **JPEG:** Android may need to generate it separately; iOS gets it from the DNG.
6. Prefer the **same C++ approach on both** platforms if fast enough → iOS decode gets a **switchable backend** (Apple CIRAWFilter vs C++), both compiled, one knob to flip, for benchmarking.
7. **Pluggable color-reduction** behind a "get color from rectangle" interface (which dominant/mean algorithm is a single selection point).
8. **Multiple reference colors** from the start (user-defined vs fixed: TBD — part 5).
9. **Defer** the preview-with-ROI-rectangles UX (note to revisit).

## Decisions to lock

- **D1 — Flag:** reuse/rename the existing `experimentalColorScreen` flag as the single gate for RAW + new algorithms (vs a new `experimentalRawColor`). Keep removal-friendly. *(default: reuse)*
- **D2 — iOS decode backend:** ship a single switch (e.g. a `DngDecodeBackend` const) selecting CIRAWFilter vs C++, both compiled — not literally commented out, so both keep building. **Coupling:** the C++ branch needs a **Bayer-RAW** capture; the C++ parser can't decode ProRAW (compressed/tiled LinearRaw). So "C++ on iOS" implies capturing Bayer RAW, not ProRAW.
- **D3 — Reducer seam:** keep `CaptureResult.decodeRoi` as the public seam; back it with a `ColorReducer` selector over `decodeDngRoisReduced`'s `{mean,dominant,variance}`. One place chooses the algorithm.
- **D4 — Eviction:** small policy interface; default keep-last-N (N=10). Age/size/free-space slot in later.
- **D5 — Multi-ref:** analysis takes N reference ROIs + the soil ROI; the reference set is data (built-in list now, extensible to user-defined in part 5).

## Slices (each lands green behind the flag; no stacked PRs)

Status key: ☐ todo · ◐ in progress · ☑ landed · 🚢 merged to main

### P0 — Preflight: dependency & patch reconciliation ☑
Resolved more cheaply than feared: the research branch had already caught up to
**RN 0.86.3 / Expo 57** (identical to main) and builds with the full RAW stack, so
there was no version gap — just a known-good dependency set to replicate.
- ☑ Reconciled `patches/*`: 3 of 4 (`@rnmapbox/maps`, `native-base`, `react-native`) already on main unchanged; only `react-native-vision-camera+5.1.1.patch` (ProRAW) was ported. (Note: `react-native+0.85.3.patch` is pre-existing on main and applies to 0.86.3 with a harmless patch-package warning — main's status quo, not this slice's concern.)
- ☑ Added `react-native-vision-camera@5.1.1`, `react-native-vision-camera-worklets@5.1.1`, `react-native-nitro-modules@0.36.1`, `react-native-nitro-image@0.15.1` (`react-native-worklets@0.10.1` already on main). Nitro codegen pulled via nitro-modules.
- ☑ `npm install` clean, patch-package applies the ProRAW patch cleanly; **iOS + Android debug builds run** with the new deps present (local native modules land in 2.1).

### 2.0 — Single feature flag
- ☐ Land the gate (D1); settings toggle. Off = zero behavior change; on = experimental color path.

### 2.1 — Port native modules + capture router + patches
- ☐ Port `modules/{dng-decoder,frame-analyzer,raw-camera-android}`, `patches/`, and `src/components/inputs/image/{RawCameraView,captureTypes,RawPickImageButton,androidRawCaptureRequest,...}`.
- ☐ **Dedup `frame_analyzer.cpp`** to one shared copy during landing.
- ☐ Prebuild/config-plugin wiring; CI builds both platforms.
- ☐ Accept: capture a DNG on a RAW-capable device per platform; `decodeRoi` returns a color.

### 2.2 — Capability detection + fallback
- ☐ Implement real `useRawOrJpegCapture` detection — iOS (vision-camera ProRAW/raw support), Android (`raw-camera-android` RAW_SENSOR capability). *(Verify doc claim that it currently returns `isRawAvailable:false` unconditionally.)*
- ☐ Unavailable → JPEG path; add a forced-fallback dev switch; unit-test the decision.

### 2.3 — Managed temp storage + eviction
- ☐ `rawCaptureStore` over `cacheDirectory`: dedicated subdir + index (`id, ts, format, dngPath, jpegPath, siteId?`); eviction policy interface; default keep-last-N (N=10); clear-all.
- ☐ Route the capture flow through the store (replace ad-hoc writes); unit tests for eviction.

### 2.4 — "Get color from ROI" reducer seam + multi-ref
- ☐ Formalize the `ColorReducer` selector over `{mean,dominant,variance}`; implementations: mean / trimmed-mean / dominant (median-cut) / clipped-excluded.
- ☐ Multi-ref: N reference ROIs + soil ROI → keyed colors.
- ☐ Parity test device vs Mac CLI on a fixture.

### 2.5 — JPEG companion per platform
- ☐ iOS: extract embedded preview JPEG. Android: generate a JPEG/preview (capture-side or an Android `renderPreview`). Unified "display image for a capture".
- ☐ Accept: both platforms yield a viewable image for a capture. *(Verify Android `renderPreview` gap.)*

### 2.6 — iOS decode-backend toggle + benchmark
- ☐ iOS backend switch (CIRAWFilter vs C++), both compiled, one knob (D2). Document the Bayer-capture coupling.
- ☐ Benchmark decode+reduce both backends on-device; record findings (feeds the part-3 color-consistency decision).

### 2.7 — Settings: stored-captures + upload (LATER / placeholder)
- ☐ Settings section listing stored captures; upload action TBD. Start read-only list.

### Deferred — preview-with-ROI-rectangles UX
Live overlay / ROI-picker (research "phase 8"). Revisit after the above; use simpler capture UX meanwhile. Android `renderPreview` also pending.

## Sequence & dependencies

P0 → 2.0 → 2.1 → (2.2, 2.3 parallel) → 2.4 → 2.5 → 2.6; 2.7 later; multi-ref threaded through 2.4; UX deferred.

## Risks / things to verify against code

- ~~**Patch/version drift** (RN 0.85.3 / vision-camera 5.1.1 patches vs main) — highest-risk preflight item.~~ **Resolved in P0:** research is on RN 0.86.3 (== main); only the ProRAW patch needed porting.
- Nitro codegen version compatibility.
- Android `renderPreview` not implemented (affects 2.5 ROI-picker UI).
- iOS C++ decode requires Bayer capture (ProRAW incompatible) — couples D2 to capture format.
- The research `docs/raw-camera-plan.md` may be stale — code wins.

## Open questions

- Flag: reuse `experimentalColorScreen` vs a dedicated `experimentalRawColor`?
- Storage retention specifics + whether captures associate to a site/soil sample (needed for upload).
- iOS capture format default (ProRAW vs Bayer) for production vs the benchmark path.
- Reference set: built-in vs user-defined (overlaps part 5).
