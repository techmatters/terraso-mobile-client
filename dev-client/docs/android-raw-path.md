# Android RAW path for the Munsell chart validator

## Goal

Characterise + optimise colour correction on both Android and iOS phones. The
mac batch analyzer must reflect *exactly* what each phone does with each
capture — so we can compare RAW-vs-JPEG pipelines on both platforms as a real
measurement, not an "Apple's guess at an Android sensor's colours" mismatch.

## Same-code-path invariant

Which decoder mac uses must mirror which decoder the on-device phone uses for
that same file. Today's status:

| Source                | On-device decoder        | Current mac decoder    | Correct?              |
|-----------------------|--------------------------|------------------------|-----------------------|
| iOS DNG               | CIRAWFilter (Core Image) | `dng-cli` (CIRAWFilter)| **yes**, matches      |
| iOS JPEG (embedded)   | CIImage / libjpeg        | `dng-cli` (CIImage)    | **yes**, matches      |
| Android DNG           | custom C++ (`cpp/`, JNI) | (none yet — would fall back to `dng-cli` / CIRAWFilter) | **NO** — Apple decoding an Android capture |
| Android JPEG          | libjpeg (Android ISP → JPEG file) | `dng-cli` (CIImage / libjpeg) | **yes**, matches — JPEG decode is universal once the ISP-written bytes are on disk |

So the only real work is:
1. Get Android to produce both a DNG and a JPEG for one shutter.
2. Give the mac a C++ path that mirrors the Android C++ decoder.

## Android capture — single shutter, two files

### Option A: Camera2 dual-output (preferred)

`CaptureRequest` in Camera2 can target multiple `ImageReader` surfaces from a
single hardware capture. Add both:

- `ImageReader` for `RAW_SENSOR` → `DngCreator` → `.dng` file
- `ImageReader` for `JPEG` → `.jpg` file

Both come out of the same sensor readout — byte-identical to what a RAW-only
or JPEG-only shutter would have produced. Single shutter click.

### Option B: CameraX (current implementation)

CameraX doesn't have first-class simultaneous RAW+JPEG. Two sub-options:

- `Camera2Interop` extensions to add a JPEG target alongside the existing RAW
  target — usable but more moving parts than dropping to Camera2 directly.
- Two sequential captures. **Not** what we want — motion between frames breaks
  the A/B invariant.

Since Android RAW today routes through our own Kotlin module (tasks #64-67),
the Camera2 dual-target path is a natural extension.

## Mac side — C++ decoder as a native binary

`modules/dng-decoder/cpp/` already contains portable C++ (DNG TIFF parser,
demosaic, colour pipeline). The Android JNI shim is in its own file (task
#70), so the core code should build with `clang` on macOS without touching
Android-specific dependencies.

Plan:

1. `CMakeLists.txt` (or a small `Makefile`) for a mac-native build target.
2. New `dng-cli-cpp` binary (or a `--decoder=cpp` flag on the existing
   `dng-cli`) that takes the same subcommands (`decode-dng-rois`,
   `read-preview-rgb`, …) and emits the same JSON. Same interface, different
   backend.
3. `scripts/analyze-fixtures.ts` inspects the filename token — `_IOS_` →
   Swift `dng-cli` (CIRAWFilter), `_ANDROID_` → new C++ CLI. JSON output
   shape unchanged; downstream chart-analysis and report code untouched.
4. Validate pixel-bit-identical results between the mac C++ CLI and the
   Android on-device output by capturing one fixture, sampling a known ROI
   on-device, sampling the same ROI on mac, comparing.

## Effort estimate

Ballpark, from where things stand today:

- **Android Camera2 dual-target JPEG+DNG capture** — half a day. Unblocks task
  #63, adds the JPEG target to the existing RAW session, wires the second
  file through `CaptureResult` (extend the `jpegPath` field we already added
  for iOS), and tweaks `friendlyStemForChartCapture` to say `ANDROID` +
  `BOTH` when the JPEG companion is present.
- **Mac C++ CLI build + `analyze-fixtures` routing** — half a day to a day.
  `CMakeLists.txt`, a tiny `main.c` that takes the same subcommands as
  `dng-cli`, JSON-serialised output. The trickier bit is verifying pixel-
  bit-identical results between the CLI and on-device Android (needs one
  fixture captured on a real phone).
- **End-to-end validation on a Pixel 6a** — half a day. Closes task #62.

**Total: ~1.5-2 days** to reach the state where the RAW-vs-JPEG-per-platform
comparison is a real measurement.

## Open follow-ups (not blockers, but worth noting)

- Colour profile parity check: our C++ decoder uses a specific ColorMatrix /
  demosaic path. Compare the resulting linear-sRGB values against a
  reference measurement (e.g., an X-Rite ColorChecker patch under known
  lighting) so we know the absolute error floor.
- On iOS the DNG's embedded JPEG is byte-identical to what a JPEG capture
  would produce (Apple's ISP output). Verify the Android Camera2 dual-target
  path gives the same guarantee — that is, the JPEG from a RAW+JPEG capture
  is bit-identical to the JPEG a JPEG-only capture of the same frame would
  produce. Otherwise the A/B is subtly biased.
- Filename convention already accommodates this — `IGNORED_TOKENS` in
  `analyze-fixtures.ts` accepts both `IOS` and `ANDROID`, and the `BOTH`
  token still applies (JPEG companion present).
