# Camera & RAW capture capabilities (Android + iOS)

What combinations of **preview**, **live analysis**, **RAW**, and **JPEG** are
possible per platform, what each combination actually *captures*, and the one
lifecycle that unifies them. This is the constraint model behind the in-app RAW
color camera (`src/components/inputs/image/SimpleRawCamera.tsx`,
`modules/raw-camera-android`, `modules/dng-decoder`). See also
[`raw-capture-integration-plan.md`](./raw-capture-integration-plan.md).

Android rows are verified on a Pixel 6a / Android 16; the stream rules are
camera2's documented guaranteed-configuration tables, so they generalize to
other RAW-capable Android devices (within the size caveats below).

## Capability matrix

| Platform | RAW support | Streams / outputs                             | Live analysis | Capture yields         |
| -------- | ----------- | --------------------------------------------- | ------------- | ---------------------- |
| Android  | RAW-capable | `preview + raw + analysis`                    | Yes           | RAW only (no HAL JPEG) |
| Android  | RAW-capable | `preview + raw + jpeg`                        | No            | RAW + HAL JPEG         |
| Android  | RAW-capable | `preview + analysis → raw + jpeg` †           | Yes           | RAW + HAL JPEG         |
| Android  | No RAW      | `preview + jpeg`                              | No            | JPEG only              |
| Android  | No RAW      | `preview + analysis + jpeg`                   | Yes           | JPEG only              |
| iOS      | RAW-capable | `preview + photo(RAW+processed)`              | No            | DNG + real JPEG/HEIC   |
| iOS      | RAW-capable | `preview + analysis → photo(RAW+processed)` † | Yes           | DNG + real JPEG/HEIC   |
| iOS      | No RAW      | `preview + photo(processed)`                  | No            | JPEG/HEIC only         |
| iOS      | No RAW      | `preview + analysis + photo(processed)`       | Yes           | JPEG/HEIC only         |

† Two-phase: at the shutter, Android **reconfigures streams** and iOS
**detaches analysis** to enter the RAW-capable configuration (see the
lifecycle below).

Legend / terminology:

- **preview** — the on-screen viewfinder. In camera2 terms a `PRIV`
  (opaque/implementation-defined) surface; on iOS the preview output.
- **analysis** — live per-frame ROI work (the red/green quality feedback). On
  Android it's a CameraX `ImageAnalysis` use case delivering `YUV_420_888`
  (a `YUV` stream); on iOS a video-data / frame output. The ROI **overlay**
  itself is a normal `View` drawn on top — it is *not* a camera stream.
- **raw** — full-sensor Bayer DNG (`RAW` stream on Android; RAW photo on iOS).
- **jpeg / processed** — the camera's HAL/ISP-processed image (demosaic +
  denoise + tone-map + HDR+/computational photography). On Android a separate
  `JPEG` stream; on iOS the `processed` format requested alongside RAW.
- **HAL JPEG** — the "pretty" camera JPEG, as opposed to one we render
  ourselves from the DNG (which uses a simpler pipeline and looks different).

## The unifying lifecycle

Both platforms converge on the same idea: **frame with `preview (+ analysis)`,
then enter a RAW-capable configuration only at the shutter.** RAW isn't needed
while framing — analysis runs off the preview/YUV path — so you don't pay for
it until capture.

- **Android** enters capture config by **swapping streams** (drop `analysis`,
  add `raw + jpeg`), because camera2 caps simultaneous streams.
- **iOS** enters capture config by **swapping the active format** (detach the
  analysis output so the session can pick a RAW-capable format), because iOS has
  no stream-count cap but ties RAW availability to the device format.

Keeping `preview` bound throughout (only adding/removing the other
outputs) avoids re-triggering preview-surface startup races.

## Android specifics

- **Streams are counted.** camera2 has documented *guaranteed stream
  combinations* keyed by hardware level and capability. A device that advertises
  RAW is `LIMITED` or higher, and its RAW table guarantees the 3-stream combos
  `preview + raw + analysis` (`PRIV + YUV + RAW`) and `preview + raw + jpeg`
  (`PRIV + JPEG + RAW`) — **at standard sizes** (RAW at full sensor,
  preview/analysis ≤ preview size, JPEG at max).
- **4 streams is not guaranteed** — `preview + raw + jpeg + analysis` is *not*
  in the table, which is why the Pixel 6a rejects it. Hence the trade: with RAW
  bound you get **jpeg XOR analysis**, not both.
- **RAW and JPEG are separate streams.** To get the HAL JPEG you must bind the
  JPEG stream at capture.
- **You cannot derive the HAL JPEG from the DNG.** Android's `DngCreator` stores
  raw Bayer + a small thumbnail, not the full ISP JPEG; rendering a JPEG
  ourselves from the DNG uses a simpler pipeline (no HDR+) and will look
  different. If you need the real camera JPEG, you must capture the JPEG stream.
- **Not all devices support RAW.** `LEGACY` devices can't; many low-end devices
  don't advertise the RAW capability → JPEG-only. **Detect at runtime** (RAW
  capability + a try-bind ladder); don't assume.

## iOS specifics

- **No stream-count cap.** preview + analysis + photo outputs coexist; the real
  constraint is the single **active device format**.
- **RAW + the real JPEG come from one capture.** `AVCapturePhotoSettings` can
  request RAW *and* a processed format together, so one shutter returns both a
  DNG and a true ISP JPEG/HEIC — no need to derive one from the other.
- **The only conflict is RAW-photo vs the analysis output.** Attaching a
  frame/video output can push the session to a format that doesn't offer RAW
  photo capture. We handle it by **detaching analysis around the shutter**
  (plus `pixelFormat:'native'` + `enablePreviewSizedOutputBuffers` to minimize
  the disturbance). Whether a detach is truly required is device/format
  dependent; detaching unconditionally is the safe default.
- **Processed-only capture has no conflict** → on non-RAW devices/formats,
  analysis + capture coexist with no gymnastics.
- **RAW support varies** (ProRAW is Pro-only; plain Bayer RAW is broader but not
  universal, and can be format-dependent) → detect, with a JPEG fallback.

## Design takeaways

- Treat the camera as a **lifecycle** (framing config → capture config →
  framing config), not a single static stream set.
- The "can't have it all at once" constraint lives in **one** place (the
  framing→capture transition), invisible to app callers.
- Expose a resolved **capability** per device/config and a uniform capture
  result (`{ raw?, jpeg? }`), so the app sees the same contract regardless of
  platform or whether RAW was available.
