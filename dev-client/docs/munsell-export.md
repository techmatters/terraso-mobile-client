# Munsell Chart Validator — JSON export plan

Working doc. We iterate here; nothing is code yet.

Goal: replace CSV with a JSON export that carries per-capture metadata
alongside per-cell measurements, and supports concatenating many
captures into a single file for cross-run analysis (Python / pandas).

## Draft shape (current best proposal)

```json
{
  "schema_version": "1.0.0",
  "captures": [
    {
      "capture_id": "2026-08-05T14-32-11-uuid",
      "label": "10YR sunlight test 3",
      "captured_at": "2026-08-05T14:32:11Z",
      "captured_at_epoch": 1786077131,
      "device": {
        "model": "iPhone 16 Pro",
        "os": "iOS 26.1",
        "system_name": "iOS",
        "system_version": "26.1",
        "brand": "Apple",
        "manufacturer": "Apple",
        "locale": "en-US",
        "screen": { "w": 1206, "h": 2622, "scale": 3.0 }
      },
      "app": {
        "version": "1.4.8",
        "build_number": "123",
        "bundle_id": "org.terraso.mobile",
        "git_sha": "fc549e1b",
        "channel": "staging"
      },
      "capture_format": "raw",
      "source_path": "IMG_1234.DNG",
      "environment": {
        "illuminant_tag": "sunlight",
        "tester": "js",
        "notes": "chart on car hood, slight breeze"
      },
      "exif": {
        "iso": 100,
        "exposure_time_s": 0.008,
        "aperture": 1.78,
        "focal_length_mm": 6.86,
        "white_balance_mode": "auto",
        "brightness_value": 4.2,
        "flash": false,
        "orientation": 1
      },
      "page": "10YR",
      "registration": {
        "algorithm_version": 3,
        "match_score": 32.8,
        "match_total": 33,
        "n_detected_circles": 38,
        "n_matched": 33,
        "n_rejected": { "brightness": 4, "outside_guide": 1 },
        "paper_luma": 108.3,
        "avg_luma": 72.1,
        "guide_rect": { "x": 122, "y": 340, "w": 780, "h": 1040 },
        "preview_dims": { "w": 900, "h": 1200 },
        "source_dims": { "w": 3024, "h": 4032 }
      },
      "wb_correction": {
        "mode": "per_channel",
        "reference": "10YR 5/1",
        "scale": [1.03, 1.00, 0.94]
      },
      "ref_card": {
        "name": "post-it yellow",
        "sample_rect": { "x": 640, "y": 1080, "w": 40, "h": 40 },
        "expected_linear_rgb": [0.82, 0.71, 0.31],
        "raw_linear_rgb":      [0.79, 0.69, 0.28],
        "measured_linear_rgb": [0.81, 0.69, 0.26]
      },
      "cells": [
        {
          "physical_row": 0,
          "physical_col": 0,
          "expected_notation": "10YR 8/1",
          "measured_notation": "10YR 7.8/1.1",
          "expected_linear_rgb": [0.79, 0.75, 0.69],
          "raw_linear_rgb":      [0.72, 0.70, 0.63],
          "measured_linear_rgb": [0.74, 0.70, 0.59],
          "delta_e": 2.3,
          "sample_rect": { "x": 210, "y": 380, "w": 40, "h": 40 },
          "is_reference": false
        }
      ]
    }
  ]
}
```

## Comments on the original draft

- **Outer wrapper**: yes, needed. Named it `captures` (array) with an
  explicit `schema_version`. Version field is cheap now, painful to
  retrofit later.
- **`card` → `page`**: matches the codebase's internal naming
  (`MunsellPage`, `MUNSELL_PAGES`). Minor consistency win.
- **`date` epoch → both ISO and epoch**: cheap to include both.
  Epoch is analysis-friendly, ISO is human-readable in a text editor.
- **`name` → `label` + `capture_id`**: split user-provided free-form
  label from a stable identifier. Filename or timestamp+UUID for the
  ID.
- **`device`**: at least model + OS + app version. All three inform
  reproducibility.
- **`registration`**: your `match_score` / `match_total` are the
  starting point. Suggested additions in the draft above.
- **`colors → cells`**: renamed and flattened — see next section for
  the biggest open decision.

## Decisions

### D1. Arrays throughout, not objects-as-maps

Every named collection (`captures`, `cells`, future ref-panels, etc.)
is a JSON array of self-describing objects. Rationale:

- Pandas normalizes an array into a DataFrame in one call
  (`pd.json_normalize(data, "cells")`); objects-as-maps require a
  transpose step.
- Preserves order; allows duplicates (two runs with the same label,
  two cells sampled at the same grid position during debugging).
- Every entry carries its own name / notation, so a value fished out
  of a nested tree keeps full context.

### D2. Raw values mandatory; derived "measured" values also included

Per-cell contract: BOTH raw and WB-corrected values ship in every
export.

- `raw_linear_rgb` — reference-independent. Analysis code re-derives
  any corrected view from this.
- `measured_linear_rgb` + `measured_notation` — derived using the
  currently-picked reference at export time. Serves two purposes:
    - Casual eyeballing without needing to run analysis code.
    - **Regression testing**: capture a set of exports, later re-run
      the algorithm against the same DNGs, diff the `measured_*`
      fields. Detects unintended pipeline changes.
- `wb_correction` block records which reference cell + which mode
  (per-channel vs Bradford) + the scale factors — enough for a
  reader to reproduce or replace.

### D3. JSON array for now

Structure: `{ "schema_version": "...", "captures": [...] }`. Whole
document generated at export time; no streaming.

JSONL revisit trigger: if we build an "append this capture to a
long-running log file" workflow. Not yet on the horizon.

## Per-cell fields (v1 — will refine)

Current CSV carries: expected notation, measured notation, ΔE,
expected RGB, measured RGB, is_reference. v1 JSON adds:

- `raw_linear_rgb` (mandatory per D2)
- `physical_row`, `physical_col` (grid position for spatial analysis)
- `sample_rect` (pixel region actually sampled — lets you correlate
  errors with sample-rect quality on the debug view)

Deferred, add if useful:

- Per-channel standard deviation across the sample rect (variance
  proxy — high stdev = sampling a chip edge or a non-uniform swatch).
- Pre-computed Lab values (derivable, but saves the analyst a Munsell
  library dep).

## Capture-level context

`device` block:

- `model`, `system_name`, `system_version` — from react-native-device-info.
- `brand`, `manufacturer` — matters mostly for Android (Samsung vs Pixel).
- `locale` — occasionally affects EXIF field parsing.
- `screen` — capture-time viewport dims × scale. Useful for
  correlating chart-guide placement with device size.

`app` block:

- `version` — semver from `app.config.ts`.
- `build_number` — the CI-bumped build integer (this is the one that
  differs between staging PRs).
- `git_sha` — short SHA of HEAD at build time. If not surfaced today,
  cheap to expose via Constants or a generated file.
- `channel` — `staging` / `production` / `dev`.
- `bundle_id` — belt-and-suspenders for filtering across builds.

`environment` block (user-provided at capture or export time):

- `illuminant_tag` — free-form or from a small enum
  (`sunlight` / `shade` / `overcast` / `indoor_fluorescent` /
  `indoor_incandescent` / `mixed`).
- `tester` — initials or handle.
- `notes` — free-form.

`exif` block (extracted from source DNG/JPEG where present):

- Baseline: `iso`, `exposure_time_s`, `aperture`, `focal_length_mm`,
  `white_balance_mode`, `brightness_value`, `flash`, `orientation`.
- Nice-to-have: `lens_model`, `color_space`, `datetime_original`
  (as sanity check against `captured_at`), GPS iff explicitly
  opted-in.

Open: which of these are already surfaced in JS vs would need native
plumbing. Worth an inventory pass before committing to the field
list.

## Non-goals for v1

- Backward-compatibility with the CSV format. CSV export can stay in
  the code alongside JSON during rollout, then get removed.
- Streaming / partial writes. The whole document is generated at
  export time.
- Embedding image bytes. Preview PNG stays a separate shared file.

## Automated testing (companion effort)

Related but separable from the JSON export format: a way to run the
analysis pipeline over a fixed set of DNG fixtures with different
reference cells, produce JSON exports, and diff against baseline.

**Chosen approach**: Node CLI on the Mac, using a Swift CLI
subprocess to decode DNGs via CIRAWFilter. CI comes later; local dev
first.

### Architecture

```
             ┌─────────────────────────────────────────┐
             │  Node CLI (TypeScript, via tsx)         │
             │                                         │
             │  - reads fixtures manifest              │
             │  - imports algorithm modules unchanged  │
             │  - injects Swift-CLI-based decoder      │
             │  - aggregates results → JSON output     │
             └────────────────┬────────────────────────┘
                              │ spawn per (fixture, method)
                              ▼
             ┌─────────────────────────────────────────┐
             │  Swift CLI (dng-cli)                    │
             │                                         │
             │  - reuses HybridDngDecoder Swift code   │
             │  - takes JSON args (dngPath + ROIs)     │
             │  - calls CIRAWFilter (Core Image)       │
             │  - writes JSON RGB values to stdout     │
             └─────────────────────────────────────────┘
```

Algorithm code (`chartAnalysis`, `gridRegistration`,
`matchAlgorithm`, `imageOps`, `munsellPages`, `munsellChart10YR`,
`munsell` + `delta-e` npm deps) runs on Node unmodified. Only the
DngDecoderHybrid boundary is replaced.

### Components

**1. `dev-client/tools/dng-cli/` — Swift CLI**

- New directory outside the RN build tree.
- One or more `.swift` files + a `Package.swift` (SwiftPM) or a
  bare `swiftc` build script.
- Reuses the CIRAWFilter code by importing the same decoder Swift
  class as the iOS Nitro wrapper. To make sharing work cleanly:
  refactor `HybridDngDecoder.swift` to extract the CIRAWFilter-
  touching methods into a plain Swift class with no Nitro
  dependency (e.g., `DngDecoderCore`). Both the RN Nitro shim and
  the CLI import that core class.
- Subcommands (or method flag) mirror the DngDecoderHybrid surface:
    - `decode-dng-rois <dngPath> --rois <json>` → JSON of RGB triples
    - `decode-photo-rois <imgPath> --rois <json>` → same for JPEG/HEIC
    - `render-preview <dngPath> --max-dim <n> --out <png-path>`
    - `read-preview-rgb <dngPath> --max-dim <n>` → JSON header +
      base64/raw RGB buffer on stdout
    - `read-metadata <dngPath>` → JSON metadata
- Compile step: `swiftc … -o dng-cli`. Binary lives in
  `dev-client/tools/dng-cli/build/`.
- Build command wired into `package.json` scripts so `npm run
  build:dng-cli` produces the binary.

**2. `dev-client/scripts/analyze-fixtures.ts` — Node runner**

- Uses `tsx` (or ts-node) so we don't add a separate compile step.
- CLI: `npx tsx scripts/analyze-fixtures.ts --fixtures ./fixtures
  --out ./results/run-2026-08-05.json [--refs 10YR-5-1,10YR-6-1]`.
- Reads fixture manifest (see § Fixture layout).
- For each fixture: constructs an "adapter" `DngDecoderHybrid`-
  shaped object whose methods spawn the Swift CLI via
  `child_process.execFile`, parse the JSON output, return the
  values the algorithm code expects. Injects it into the pipeline
  (see § DI section).
- For each reference-cell in the sweep list: re-runs the derivation
  layer (`computeCellResults`) — this is pure JS, no re-decode.
- Aggregates each (fixture, reference) as one entry in
  `captures[]`, writes the whole array as a single JSON file.

**3. `dev-client/src/screens/MunsellChartValidator/` — small refactor**

To make `chartAnalysis` importable on Node:

- Replace the direct `import {DngDecoderHybrid} from 'dng-decoder'`
  with dependency injection: `analyzeMunsellChart` takes a
  `decoder: DngDecoderLike` param (or a module-level setter). App
  code passes the real `DngDecoderHybrid`; Node runner passes the
  Swift-CLI adapter.
- Alternative if DI feels invasive: use a Node-side module alias
  (via `tsx` config or a shim file) that resolves `'dng-decoder'`
  to a stub that calls out to the CLI. Same effect, no algo-code
  changes. Slightly more magical.
- Verify no other RN-only imports leak into the algo modules
  (`react-native`, native module registrations, `NativeModules`,
  Expo APIs, etc.). If any do, factor them out.

### Fixture layout

```
fixtures/
  10YR_sunlight_run1.dng
  10YR_sunlight_run1.json           # optional sidecar
  10YR_shade_run2.dng
  GLEY1_indoor_run1.dng
  GLEY1_indoor_run1.json
  ...
  fixtures.json                     # optional top-level overrides
```

- **Directory scan** finds all `.dng` (and later `.jpg`/`.heic`).
- **Filename convention** encodes defaults: `<PAGE>_<TAG>_<TAG>...
  .dng` → page inferred from first token, other tokens become
  free-form tags.
- **Sidecar** overrides: explicit `page`, per-fixture references to
  sweep, ground-truth Munsell if known, illuminant tag, notes.
- **Top-level `fixtures.json`** (optional): global defaults (e.g.,
  default reference sweep list, output format).

### Output layout

```
results/
  run-2026-08-05T14-32-11.json       # captures[] for the whole run
  previews/
    10YR_sunlight_run1.preview.png   # from render-preview
    10YR_sunlight_run1.mask.png      # optional (see below)
  ...
```

- Single JSON file per run, matching the format defined earlier in
  this doc. Each `captures[]` entry has `capture_id =
  "<fixture>__<reference>"` for cross-run diffs.
- Preview PNGs: cheap to produce (Swift CLI already renders one);
  ship in a subdirectory for eyeballing.
- Mask / debug-overlay PNGs: skip for v1. They currently come from
  the RN SVG export path; reimplementing in Node is a rabbit hole.
  Add later if the value shows up.

### Data flow — end to end

1. `npm run build:dng-cli` — compiles Swift binary (once per code
   change).
2. `npm run analyze-fixtures -- --fixtures ./fixtures --out
   ./results/run.json` — runs the Node CLI.
3. Node runner scans `./fixtures/`, resolves per-fixture config.
4. For each DNG:
   - Spawn `dng-cli read-preview-rgb` → get small preview buffer.
   - Pass buffer to `detectChartByRegions` / `whiteMask` / etc.
   - Spawn `dng-cli decode-dng-rois` with the sample-rect list from
     `matchedSampleRects` → get per-cell RGB.
   - For each reference in the sweep: run `computeCellResults`.
   - Emit one `captures[]` entry per (fixture, reference).
5. Write results JSON. Done.

### Sanity check: which DngDecoderHybrid methods matter

Grepping usages in `chartAnalysis.ts` (and its downstream imports):

- `decodeDngRois` — per-cell sampling. Load-bearing.
- `decodePhotoRois` — same, JPEG/HEIC path. Include from day one so
  photo captures also test.
- `renderPreview` — preview PNG output. Nice for eyeballing; not
  strictly needed for numeric regression.
- `readPreviewRgb` / `readPreviewRgbPhoto` — feeds the classifier.
  Load-bearing.
- `readPreviewGrayscale` — check current callers before dropping.
- `readMetadata` — used for source dims; needed.

Effective minimum: `decodeDngRois`, `readPreviewRgb`,
`readMetadata`. Add the photo variants and `renderPreview` in the
same pass for symmetry.

### Cost estimate

- Swift CLI extraction + subcommands: 1 day (mostly refactoring
  existing Swift into a Nitro-independent core, plus the CLI
  wrapper).
- Node runner + adapter + DI (or module alias): 1 day.
- Fixture manifest handling + output-format wiring: 0.5 day.
- Fixture capture + baseline JSON: 0.5 day (mostly walking around
  taking DNGs of representative chart pages).

Rough total: 2–3 focused days. Everything after that is refinement
(new fixtures, new reference sweeps, output format iteration).

### What this deliberately doesn't do (v1)

- No CI integration. Local dev only. CI is a separate follow-up
  once the format and fixture set stabilize.
- No mask/debug-overlay PNG output. JSON + preview PNG only.
- No Android decoder parity. Swift CLI is Mac-only; Android runs
  its own C++ decoder in production and we're not testing that from
  Node. If Android-specific decoder regressions matter, add an
  on-phone batch mode later.
- No HTTP fetch/upload of fixtures — everything is local filesystem.
  Add later if the fixture set grows beyond what fits on the dev
  Mac.

### Fixture manifest — file vs naming convention

Sub-decision: how does the runner know what to process?

- **Manifest file** (`fixtures.json`) — explicit list, per-fixture
  overrides (which references to try, ground-truth Munsell if known,
  illuminant tag, notes). Change = edit file.
- **Naming convention** (`10YR_sunlight_run1.dng`) — auto-discovered
  by directory scan. Simpler to add fixtures. Rigid metadata.

Recommendation: **hybrid**. Directory scan for discovery + optional
`.json` sidecar per fixture for overrides (`10YR_sunlight_run1.json`
next to the DNG). No sidecar = infer page from filename prefix and
apply defaults. Best of both.

### Reference-cell sweep

For each fixture, options for which references to try:

- **Default only** — one reference per fixture (e.g., 10YR 5/1).
  Cheapest.
- **Near-neutrals subset** — 5/1, 6/1, 7/1. Reasonable default;
  covers the WB targets people actually pick.
- **All cells** — N × M results per run. Comprehensive; catches
  reference-sensitivity issues.
- **Ref-card only** — measures how well the ref card works as a WB
  anchor (the intended production use).

Fits naturally into the JSON schema: each (fixture, reference)
combination is one entry in `captures[]`, all in the same output
file.

## Next iteration

Fill in / correct:

- Whether to keep CSV export at all, or hard-swap. Leaning hard-swap
  after one or two rounds of dogfooding — carrying both formats has
  ongoing cost.
- Which of the "optional" registration fields are actually surfaced
  in the pipeline today vs would need to be plumbed through.
- Which `exif` / `device` / `app` fields are already in JS today vs
  need native or config plumbing.
- Naming: `linear_rgb` vs `srgb_linear` vs `rgb_linear` — pick one
  and be ruthless.
- File extension + MIME type for `Share.open`
  (`.json` + `application/json`).
- Where the `environment` block gets populated — capture-time prompt,
  post-capture edit, or export-time prompt.
