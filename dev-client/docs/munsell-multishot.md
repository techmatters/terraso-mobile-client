# Munsell multi-shot data collection

Research-phase workflow for capturing many Android RAW+JPG pairs of
Munsell charts under different capture parameters, sharing them off
the phone in one go, and running offline algorithm experiments on
the resulting fixture batch.

The user-facing UX is a single button — "MULTI" — on the Android RAW
capture screen. Push it, hold the phone still for ~10 seconds, done.
9 shots land in a session folder on the phone; pull them off later
via `adb pull`.

## What one press captures

Every MULTI session fires 9 shots against the same physical scene:

| # | Kind    | Shutter | ISO | Purpose |
|---|---------|---------|-----|---------|
| 1 | burst 1/5 | AE-auto | AE-auto | Baseline auto-exposure |
| 2 | burst 2/5 | AE-auto | AE-auto | (AE + AWB locked to shot 1) |
| 3 | burst 3/5 | AE-auto | AE-auto | Sibling for offline averaging |
| 4 | burst 4/5 | AE-auto | AE-auto | Same |
| 5 | burst 5/5 | AE-auto | AE-auto | Same |
| 6 | manual  | 1/30    | 100 | 2× shutter vs the AE baseline — real photon count doubling |
| 7 | manual  | 1/15    | 100 | 4× shutter — characterises where highlight clipping begins |
| 8 | manual  | 1/60    | 400 | Same brightness as #7 but via ISO instead of shutter |
| 9 | manual  | 1/30    | 200 | Mid-point handheld tradeoff |

Rationale for the sweep:

- **Auto burst (1–5).** Locks AE + AWB before firing so all frames
  share identical sensor state, then averages nicely in offline
  analysis. See docs/munsell-dark-sensor.md option #3 for the shot-
  noise justification. Skipping the (1/60, ISO 100) baseline single
  shot — the auto burst covers that regime.
- **Manual shutter sweep (6, 7).** Isolates the effect of longer
  exposure on RAW SNR. Shot noise is Poisson: √2 shot noise
  reduction per doubling of collected photons.
- **ISO vs shutter comparison (7 vs 8).** Same total brightness
  achieved two ways. If shot 8 has visibly more noise than shot 7,
  shutter wins for static scenes; if similar, ISO is a viable
  substitute for handheld cases where longer shutter risks blur.
- **Handheld sweet spot (9).** (1/30, ISO 200) is the compromise most
  photographers land on for handheld low-light — worth including as
  the "what a reasonable end-user would set" reference.

Not included:

- **EV compensation.** Prior tests showed EV mostly doesn't reach RAW
  in bright scenes — AE hits its safe-handheld budget quickly, and
  the ISP fakes the rest in JPEG post-hoc. Not useful for RAW
  research. See docs/munsell-dark-sensor.md diagnostic section.
- **Very slow shutters (>1/8s).** Would require a tripod; out of
  scope for research on the typical handheld workflow.
- **Very high ISO (>800).** Interesting for extreme-dim scenes; add
  later once we know how (1/60, ISO 400) looks.

Total data per session: 9 DNG + 9 JPEG ≈ **~200 MB**. See "Storage
and transfer" below for batching guidance.

## Where the files land

MULTI writes to the phone's public `Download/` folder under a
per-session subdir. Filenames are ENRICHED: they self-encode the
device, the user-supplied session context (page / bg / ref card /
illuminant), the shot kind, and the ACTUAL sensor iso/shutter that
the HAL used for that shot (not just what was requested).

```
/sdcard/Download/soilcap/
  session_20260821T144215-317/
    01_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst1of5_awblock.dng
    01_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst1of5_awblock.jpg
    02_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst2of5_awblock.dng
    02_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst2of5_awblock.jpg
    …
    05_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst5of5_awblock.dng
    05_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst5of5_awblock.jpg
    06_pixel6a_10YR_dark_refmulti_lightsun_manual_iso100_shut33ms.dng
    06_pixel6a_10YR_dark_refmulti_lightsun_manual_iso100_shut33ms.jpg
    07_pixel6a_10YR_dark_refmulti_lightsun_manual_iso100_shut67ms.dng
    07_pixel6a_10YR_dark_refmulti_lightsun_manual_iso100_shut67ms.jpg
    08_pixel6a_10YR_dark_refmulti_lightsun_manual_iso400_shut17ms.dng
    08_pixel6a_10YR_dark_refmulti_lightsun_manual_iso400_shut17ms.jpg
    09_pixel6a_10YR_dark_refmulti_lightsun_manual_iso200_shut33ms.dng
    09_pixel6a_10YR_dark_refmulti_lightsun_manual_iso200_shut33ms.jpg
    session.json    ← structured metadata (see "Session sidecar" below)
    note.txt        ← only present when the session-note field is non-empty
  session_20260821T144425-511/
    …
```

### Filename token schema

```
<seq>_<device>[_<page>][_<bg>][_ref<card>][_light<slug>]_<kind>_iso<n>_shut<X>[_burst<i>of<N>][_awblock].<ext>
```

| Token | Source | Optional? | Example |
|---|---|---|---|
| `<seq>` | 1-based capture index, zero-padded to session size | required | `01`, `09` |
| `<device>` | `Build.MODEL` slugified (lowercase, alnum only) | required | `pixel6a`, `pixel7`, `iphone14pro` |
| `<page>` | Munsell chart page from Session context | if set | `10YR`, `5R`, `2.5YR` |
| `<bg>` | Background paper from Session context | if set (`light` / `dark`) | `light`, `dark` |
| `ref<card>` | Reference-card layout from Session context | if set | `refmulti`, `refgreycard`, `refwhibal`, `refpostit`, `refwhite`, `refnone` |
| `light<slug>` | Illuminant type from Session context | if set | `lightsun`, `lightshade`, `lightled3000k`, `lightflash` |
| `<kind>` | `auto` (burst frame, no manual override) or `manual` (iso+shutter forced) | required | `auto`, `manual` |
| `iso<n>` | **Actual** ISO from `TotalCaptureResult.SENSOR_SENSITIVITY` (post-AE) | required | `iso61`, `iso199`, `iso395` |
| `shut<X>` | **Actual** shutter from `TotalCaptureResult.SENSOR_EXPOSURE_TIME`, rounded human-readable | required | `shut25ms`, `shut67ms`, `shut500us` |
| `burst<i>of<N>` | Position within auto burst (auto shots only) | for burst frames | `burst3of5` |
| `awblock` | AWB was locked (i.e. burst locked so frames are consistent) | when true | `awblock` |
| `.<ext>` | `.dng` or `.jpg` | required | |

Tokens the user hasn't set (page / bg / refCard / illuminant) are
simply omitted, giving shorter but still-unique filenames. Minimal
example (no context set, single manual shot):

```
01_pixel6a_manual_iso100_shut33ms.dng
```

The `Session context` panel on the "RAW & color tools (dev)" screen
is where the user fills in page / bg / ref-card / illuminant / note.
Values persist across app launches (MMKV-backed) so you set them
once per setup and they stick.

Written via `MediaStore.Downloads` (Android 10+), so the files are:
- Fully visible in the **Files** and **Google Drive** apps (browse
  to Downloads → soilcap/session\_…)
- Long-press → delete in the Files app frees the storage
- Accessible via `adb pull` (see below) at the standard sdcard path
- Owned by our app in the MediaStore sense (so we can silently
  delete/modify without a prompt) — other apps may prompt for
  confirmation on modify/delete, which is Android's design, not a
  limitation of our approach.

The **single-shot** shutter (the round button, not MULTI) still
writes to the app's private cache dir — unchanged from before,
because that path is optimised for the built-in analyser + share-
sheet flow, not for accumulating batches.

## Session sidecar (`session.json` + optional `note.txt`)

Alongside the image files, MULTI drops a `session.json` in the session
directory with structured metadata for programmatic consumption. It's
redundant with the filename tokens for the essentials but adds things
that don't fit safely in filenames — precise numeric values, device
OS version, per-shot requested-vs-actual comparison, and free-form
user notes.

Sample:

```json
{
  "session_id": "20260821T144215-317",
  "schema_version": "1",
  "device": {
    "make": "Google",
    "model": "Pixel 6a",
    "slug": "pixel6a",
    "android_release": "14",
    "android_sdk_int": 34
  },
  "context": {
    "page": "10YR",
    "background": "dark",
    "ref_card": "multi",
    "illuminant": "sun",
    "note": ""
  },
  "shots": [
    {
      "filename": "01_pixel6a_10YR_dark_refmulti_lightsun_auto_iso61_shut25ms_burst1of5_awblock",
      "kind": "auto_burst",
      "burst_idx": 1,
      "burst_total": 5,
      "requested": {"ae_lock": true, "awb_lock": true},
      "actual": {"iso": 61, "shutter_ns": 25000000, "ae_mode": 1, "awb_mode": 1, "ae_locked": true, "awb_locked": true}
    },
    {
      "filename": "06_pixel6a_10YR_dark_refmulti_lightsun_manual_iso100_shut33ms",
      "kind": "manual",
      "requested": {"iso": 100, "shutter_ns": 33333000, "ae_lock": false, "awb_lock": false},
      "actual": {"iso": 100, "shutter_ns": 33333000, "ae_mode": 0, "awb_mode": 1, "ae_locked": false, "awb_locked": false}
    }
  ]
}
```

Notes:
- `shots[].filename` is the stem (no extension) — both `.dng` and
  `.jpg` share it.
- `shots[].requested` shows what we asked the camera to do; `actual`
  shows what the HAL reported doing (`SENSOR_SENSITIVITY` and
  `SENSOR_EXPOSURE_TIME` from `TotalCaptureResult`, plus AE/AWB state).
  These diverge whenever AE was on and picked its own values.
- `ae_mode` values match Camera2 constants: 0 = OFF, 1 = ON, etc.
- Best-effort write: if the sidecar fails, the shot files are still
  fully usable (redundant with filename tokens).

If the user typed a session note, it lands in `note.txt` next to
`session.json` — plain text, whatever they wrote. Doesn't affect
anything else.

## Pulling data off the phone

The MULTI folder is at a well-known location, so `adb pull` grabs an
entire batch in one command:

```bash
adb pull /sdcard/Download/soilcap ~/soilcap-2026-08-19
```

That's a full recursive tree pull. On USB 3 (typical USB-C to Mac),
a 5 GB batch transfers in ~1–2 minutes. Cellular data cost: zero.

After pull, clear the phone to free storage for the next batch:

```bash
adb shell rm -rf /sdcard/Download/soilcap/session_*
```

Or delete via the Files app on the phone (long-press → trash icon)
if you prefer a GUI.

### For non-developer Macs — installing `adb`

ADB (Android Debug Bridge) is a single command-line binary. Two
options for a fresh install on an ARM Mac (M-series):

1. **Homebrew (recommended)** — one command:
   ```bash
   brew install --cask android-platform-tools
   ```
   Adds `adb` to `/opt/homebrew/bin/`, already on the default PATH.
   ~10 MB download; native ARM64 binary since a few releases back.

2. **Direct download from Google** — grab the zip at
   https://developer.android.com/tools/releases/platform-tools,
   unzip somewhere (e.g. `~/android-platform-tools/`), add that dir
   to your `PATH`. No installer runs, no admin needed.

Then on the phone: **Settings → About phone → tap "Build number"
seven times → Developer options → USB debugging: On.** Plug into the
Mac, run `adb devices`, accept the phone's "Allow USB debugging?"
prompt on first connection.

Total setup: ~5 minutes. From then on, `adb pull …` is one line.

## Storage sizing

Per session: ~200 MB.

- **Pixel 4** (usually 64 GB total, 10–25 GB free on a daily driver):
  ~50 sessions before you should transfer.
- **Pixel 7** (usually 128 GB total, 30–60 GB free): ~150–300
  sessions before transfer.

For a full research batch of 36 Munsell cards × 2 backgrounds ×
3 times of day = 216 sessions ≈ **43 GB**, plan to split into
2–4 batches with ADB pulls in between.

## White reference patch

A fourth patch — plain office **printer paper**, ~0.85 linear-sRGB
grey — is now recognised in the multi-ref card layout, below the
greycard slot. The full slot list is:

| slot | y-row | expected linear sRGB | notes |
|------|-------|----------------------|-------|
| whibal   | 0 | (0.400, 0.400, 0.400) | WhiBal G7 |
| postit   | 1 | (0.9542, 0.887, 0.362) | 3M canary-yellow post-it |
| greycard | 2 | (0.180, 0.180, 0.180) | 18% neutral gray card |
| **white**| 3 | (0.850, 0.850, 0.850) | **NEW — plain printer paper (placeholder)** |

The 0.85 value is a placeholder; refine with a per-batch measurement
once we characterise the specific paper stock in use.

Updated in three coordinated places (they all share the same
`MULTI_CARD_OFFSET_PITCHES` alignment convention):

- `src/screens/MunsellChartValidator/matchAlgorithm.ts` — the app's
  MULTI_CARD_POINTS array (adds slot 4).
- `scripts/munsell-card-guide/generate.mjs` — the print-at-100%
  template (adds a labeled "White" square at row 4).
- `scripts/analyze-fixtures.ts` — the offline analyser's REF_CARD_EXPECTED
  + REF_CARD_DISPLAY_NAMES tables + multi-mode sweep list.

Note: there is a separate synthetic `paper` ref used only on
LIGHT-BG shots, derived from the white-mask border ring (not the
physical card). Different code path — the new `white` slot is a
real physical patch, always visible regardless of background.

## Naming convention for offline grouping

The offline analyser (`analyze-fixtures.ts`) already understands the
existing `_burstNofM` filename convention and emits synthetic
"burstavg" captures per group. That grouping happens on filename
tokens, so it works whether the frames are in a `session_…/`
folder or a flat fixtures dir.

For the new MULTI-session filenames:
- `burstNofM_auto` — treated as a burst group (avg'd per session).
- `manual_iso<n>_shut<X>` — treated as an individual capture with
  the iso + shutter tokens ending up in the analyser's `tags` list.

Manual shots don't currently share a "same physical scene" group
across their own dimension (iso × shutter). If we want cross-manual
comparisons in the report later, we can extend the analyser to key
off the session dir. Not needed yet — inspect them individually in
the filmstrip filter for now.

## Black-preview bug (known, unfixed)

Sometimes when opening the capture screen the preview stays black,
even though CameraX reports the surface is bound. Retrying 3–4
times usually recovers. Symptoms suggest a race between the
`SurfaceProvider` attach and CameraX's PreviewView going into
STREAMING state.

**Not fixed in this pass** — the research workflow tolerates a few
retries, and diagnosing needs data. Two diagnostics were added to
help future debugging:

1. **Attach-timing logs** on `RawCameraAndroidView.onAttachedToWindow`:
   ```
   onAttachedToWindow: view size=WxH surfaceProvider=…
   onAttachedToWindow: attaching surface provider (+0ms)
   onAttachedToWindow: attach complete (+123ms)
   ```
2. **`PreviewStreamState` transitions** logged as they happen:
   ```
   previewStreamState → IDLE (+15ms since attach)
   previewStreamState → STREAMING (+340ms since attach)
   ```

Filter `adb logcat` on tag `RawCameraAndroid.View` to see the
timeline. Comparing a good session vs a bad session should surface
what stage stalls — surface never handed off, handed off but
producer never wired, wired but frames never arrive.

## Files touched by this pass

- **Native (Kotlin)**
  - `modules/raw-camera-android/src/RawCameraAndroid.nitro.ts` — new
    `captureSession(request)` method + `SessionShot` /
    `CaptureSessionRequest` types. Codegen'd.
  - `modules/raw-camera-android/android/…/HybridRawCameraAndroid.kt` —
    delegate for the new method.
  - `modules/raw-camera-android/android/…/CameraSessionManager.kt` —
    `captureSession` implementation (fires burst then manual sweep);
    MediaStore.Downloads writer for both DNG (via `DngCreator` on the
    ContentResolver's OutputStream) and JPEG (via
    `ImageCapture.OutputFileOptions` overload for MediaStore).
  - `modules/raw-camera-android/android/…/RawCameraAndroidView.kt` —
    added attach-timing + `PreviewStreamState` debug logging.
- **JS**
  - `modules/raw-camera-android/src/index.ts` — re-export new types.
  - `src/screens/AndroidRawCaptureScreen.tsx` — MULTI button + full-
    screen progress overlay; on success pops one screen back to the
    page picker (skipping the analysis flow entirely — it's a
    data-collection path, not a measurement path).
- **White ref-card slot**
  - `src/screens/MunsellChartValidator/matchAlgorithm.ts` — 4th slot
    added.
  - `src/screens/MunsellChartValidator/chartAnalysis.ts` — union type
    updated.
  - `src/screens/MunsellChartValidator/MunsellChartValidatorScreen.tsx`
    — MULTI_SLOT_EXPECTED / MULTI_SLOT_LABEL updated.
  - `src/model/color/getColorFromLinearRgb.ts` — LINEAR_REFERENCES
    gains a `WHITE_PAPER` entry.
  - `scripts/munsell-card-guide/generate.mjs` — printout template
    updated (adds a "White" label at row 4).
  - `scripts/analyze-fixtures.ts` — REF_CARD_EXPECTED,
    REF_CARD_DISPLAY_NAMES, and the multi-mode sweep list all get
    the new slot.

## Future work

- **Live progress indicator during MULTI.** Right now the overlay
  says "Capturing…" for the whole ~10s. A native → JS progress event
  per shot would give "Capturing 4 of 9…" — nicer UX, ~30 lines of
  event bridge.
- **Session manifest.** Emit a small `session.json` next to the
  shot files listing what each filename means. Redundant with the
  filename convention, but useful for scripts that don't want to
  parse token strings.
- **Configurable sweep.** The 5+4 sweep is hard-coded. If experiment
  needs change, edit `MULTI_SESSION_MANUAL_SHOTS` in
  `AndroidRawCaptureScreen.tsx`; consider a small "sweep picker" UI
  once we know which sweeps we actually want to run.
- **Black-preview fix.** Diagnose from the newly-added logs; likely
  fix is an explicit unbind → wait → rebind on view mount when a
  stale session is detected.
- **Cross-manual grouping in the analyser.** So the report can show
  "here are all 4 manual shots for card X, at time T" as a single
  visual cluster.
