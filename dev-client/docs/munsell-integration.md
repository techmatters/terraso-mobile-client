# Munsell / soil-color integration tracker

Turning the color/Munsell research spike into a clean, releasable feature.

- **Clean branch:** `fix/improved-color-determination` (off `main`) — work happens here, ships *dark* behind the experimental flag.
- **Research branch:** `feat/munsell-export-squashed` — read-only source of truth, in worktree `../terraso-munsell-research` (25 commits, ~57k LOC, 269 files).
- **Feature flag:** `src/screens/SoilScreen/ColorScreen/experimentalColorScreenToggle.ts` (+ a UserSettings menu item). Everything user-facing stays behind this until a workstream is release-ready.
- Started: 2026-10-20.

## How we work

- **No stacked PRs.** One long-lived integration branch; partial work merges to `main` safely because the flag keeps it hidden. Land in a small number of *independent* milestone PRs off `main` — never a chain where one PR waits on another unmerged one.
- **Port, don't rewrite.** Pull coherent slices from the research branch (`git checkout feat/munsell-export-squashed -- <paths>`), then split/clean/test. The research branch is never edited.
- **Every slice lands green:** `npm run check-ts`, `npm run lint`, relevant tests, `npm run format`.
- Review happens commit-by-commit in SmartGit on the main checkout dir.

## Definition of release (draft)

- [ ] Improved color determination available behind (then eventually without) the experimental flag.
- [ ] RAW capture used when supported, graceful JPEG fallback otherwise.
- [ ] Algorithm decision (primary vs average, etc.) settled and justified by the eval harness.
- [ ] At least the yellow sticky reference supported end-to-end; other ref cards scoped.
- [ ] No regression to the current (non-experimental) color flow.
- [ ] Eval tooling reproducible by another dev.

## Workstreams

Status key: ☐ todo · ◐ in progress · ☑ landed on clean branch · 🚢 merged to main

### 1. Eval tooling (scripts/CLI/docs) — *not bundled, not flag-gated*
Research paths: `scripts/` (analyze-fixtures, munsell-*-experiment, munsell-card-guide/, delta-e-analysis.py, calibrate-ref-card.mjs, render-munsell-error.ts), `tools/dng-cli*`, `docs/munsell-*`.
- ☐ Decide what graduates into the repo vs stays research-only.
- ☐ Port the keeper scripts + a short README on running the fixture eval.
- ☐ Port relevant findings docs.

### 2. RAW captures when supported (native) ◐ — *expo bump already on main; unblocked*
**Detailed plan: [raw-capture-integration-plan.md](./raw-capture-integration-plan.md)** (slices P0–2.7).
Progress: **P0 landed** (vision-camera + Nitro dep/patch reconciliation; both platforms build+run). TS model foundation also landed (commit `feat(raw-color): add TS foundation ...`) — standalone logic + tests for the flag, capture strategy, capture store/eviction, color reducer, and reference colors (slices 2.0/2.2/2.3/2.4), **not yet wired to native decode**. Next: slice 2.1 (port native modules + capture router). **Decision to confirm:** the foundation landed a *dedicated* `experimentalRawColorToggle` rather than reusing `experimentalColorScreen` (plan D1 default was reuse).
Research paths: `modules/{raw-camera-android,dng-decoder,frame-analyzer}`, `patches/`, `src/components/inputs/image/{RawCameraView,captureTypes,...}`, `tools/dng-cli*`, `docs/{android-raw-path,raw-camera-plan}.md`. See **Native code / shared core** below for the architecture.
Reality check: capture already exists on **both** platforms (iOS = vision-camera + ProRAW patch; Android = `raw-camera-android` module) — this is port+harden, not green-field.
- ☐ Land native modules with prebuild/config-plugin wiring; confirm iOS + Android build in CI.
- ☐ RAW-capable detection + JPEG fallback path.
- ☐ Wire decode pipeline into analysis.
- ☐ **Dedup `frame_analyzer.cpp`** — one shared copy referenced by both `frame-analyzer` and `raw-camera-android` builds (currently byte-for-byte duplicated; flagged `// DUPLICATED (temporarily)`).
- ☐ Add a short comment/doc noting the iOS-CIRAWFilter vs Android-C++ decode split is intentional (capture-format-driven), so it isn't "fixed" later.

### 3. Algorithm — which color to use
Research paths: `src/screens/MunsellChartValidator/{imageOps,matchAlgorithm,gridRegistration,registration,munsellChart10YR,munsellPages}.ts`, reducers.
- ☐ Port pure algorithm modules with unit tests.
- ☐ **Open decision:** primary/dominant color vs average vs trimmed-mean — pick using the eval harness (part 1).
- ☐ Document the chosen reducer + why.

### 4. UX changes — *discuss one by one*
Research paths: `src/screens/SoilScreen/ColorScreenExperimental/*`, menu items, `ColorScreenRouter.tsx`.
- ☐ Enumerate each UX change; decide keep/cut/revise per item (separate discussion).
- ☐ Port agreed items behind the flag.

### 5. Other reference cards (beyond yellow sticky)
Research paths: `CalibrateReferenceScreen.tsx`, `ManageCustomReferencesScreen.tsx`, `munsellChart10YR.ts`, `docs/postit-yellow.md`.
- ☐ **Open decision:** fixed set of supported cards vs user-definable custom references (deferred).
- ☐ Port reference-calibration flow for the agreed scope.

## Native code / shared core

Audited 2026-10-20 (both the mobile modules and the Mac CLIs). Summary: the native
sharing is mostly already in place and well-designed. One real copy-paste to fix;
the iOS-vs-Android decode "duplication" is intentional and should stay.

**The shared C++ core** lives in `modules/dng-decoder/cpp/` — `DngParser` (TIFF/DNG
parse), `DngPipeline` (demosaic, white balance, ColorMatrix/ForwardMatrix → XYZ →
linear sRGB, preview, variance), `MedianCut` (dominant color), `DngDecoderC` (thin C
ABI). It is **pure C++17 with zero OS/JNI/Nitro/third-party includes** — portable.

**What's shared vs platform-specific:**

| Concern | Android (device) | iOS (device) | Mac tooling | Shared? |
|---|---|---|---|---|
| DNG parse + demosaic + color pipeline | C++ `DngParser`/`DngPipeline` | Apple CIRAWFilter (CoreImage) | `dng-cli-cpp` → C++; `dng-cli` → CIRAWFilter | ❌ two paths **by necessity** |
| Dominant color (median-cut) | C++ `MedianCut` | C++ `MedianCut` (post-decode) | both CLIs bridge to C++ `MedianCut` | ✅ single impl, all callers route to it |
| Frame analyzer (ROI luma/variance) | C++ `frame_analyzer.cpp` | C++ `frame_analyzer.cpp` | — | ⚠️ byte-for-byte duplicated → dedup (part 2) |
| Camera capture | Kotlin camera2 (`CameraSessionManager.kt`) | (not in these modules) | — | ❌ inherently platform-specific |

**Why two decode paths are correct, not duplication:** it mirrors a capture-format
split. Android camera2 emits uncompressed CFA Bayer DNG (the hand-rolled C++ parser
handles it); iOS emits ProRAW (lossless-JPEG, tiled LinearRaw) which the C++ parser
**cannot** decode and which needs CIRAWFilter. The two Mac CLIs deliberately mirror
the two device paths (`dng-cli-cpp` ≡ Android C++, `dng-cli` ≡ iOS CIRAWFilter) so
offline fixture analysis reproduces per-platform on-device behavior (CLI chosen by
filename token). On iOS the C++ parser/pipeline is compiled into the pod but unused
except `MedianCut` (dominant) and the metadata bridge.

**Build wiring per target:** Android CMake (C++20, globs `cpp/*.cpp`, links only
`liblog`); iOS CocoaPods podspec (globs `cpp/`, links CoreImage/CoreGraphics/ImageIO,
only `MedianCut`+`DngDecoderC` actually called); Mac `dng-cli-cpp` bash+clang++ (C++17,
the 4 core files, no external deps); Mac `dng-cli` bash+swiftc (CIRAWFilter + links
`MedianCut.o`). No external native deps anywhere (no LibRaw/libtiff/libjpeg).

**Actions** (tracked in part 2 unless noted): keep the core where it is; dedup
`frame_analyzer.cpp`; document the intentional split; *(optional)* hoist `LinearRgbF`
into a `Color.hpp` so the Swift CLI doesn't transitively pull `DngParser`/`DngPipeline`.

## Open decisions

- Algorithm: primary vs average color (part 3).
- **Cross-platform color consistency (part 3):** iOS (CIRAWFilter/Apple ISP) and Android (linear C++ pipeline) can yield different mean colors for the same scene; the *dominant* is unified via `MedianCut` but means are not. Decide whether to reconcile, or prefer a reduction that's already platform-unified.
- Reference cards: fixed vs user-defined (part 5).
- Which eval scripts/tools graduate into the repo (part 1).

## Reference: porting a slice

```
# from the clean branch (main dir)
git checkout feat/munsell-export-squashed -- <path> [<path> ...]
# then: split into a coherent commit, add/port tests, check-ts + lint + format
```
