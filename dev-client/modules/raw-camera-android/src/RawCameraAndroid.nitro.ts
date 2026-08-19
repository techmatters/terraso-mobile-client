import type {HybridObject} from 'react-native-nitro-modules';

// Result of a single dual-target capture. `dngPath` is a file:// URI
// to the on-disk DNG (via android.hardware.camera2.DngCreator);
// `jpegPath`, when present, is a file:// URI to a companion JPEG
// written by CameraX's normal photo pipeline for the SAME shutter
// press — HAL-processed (HDR+ / distortion correction / tone map /
// sharpening / white balance), so it looks like a normal camera-app
// photo and shares the same field of view / instant as the RAW.
// See docs/raw-camera-plan.md phase 7.
export type CapturedPhoto = {
  dngPath: string;
  jpegPath?: string;
  width: number;
  height: number;
};

// Per-capture experimental knobs. All fields optional; omitted → auto.
// See docs/munsell-dark-sensor.md option #4 for why we expose these.
export type CaptureOptions = {
  // Camera2 CONTROL_AE_EXPOSURE_COMPENSATION index. Integer, clamped
  // to CONTROL_AE_COMPENSATION_RANGE. Actual EV in stops = index ×
  // (CONTROL_AE_COMPENSATION_STEP num/den). Omit or 0 for default.
  aeCompensation?: number;
  // Manual sensor exposure time in nanoseconds. When set, MUST also
  // set sensorSensitivity, and CONTROL_AE_MODE is forced OFF for this
  // capture. Omit both for auto AE.
  sensorExposureTimeNs?: number;
  // Manual ISO. When set, MUST also set sensorExposureTimeNs. See above.
  sensorSensitivity?: number;
};

// One "shot" descriptor inside a captureSession request. Either a
// (iso, shutterNs) pair for a manual-exposure shot, or omit both for
// an auto-AE shot. See captureSession() below.
export type SessionShot = {
  // Manual sensor exposure time in nanoseconds. Omit (with
  // sensorSensitivity) for an auto-AE shot.
  sensorExposureTimeNs?: number;
  // Manual ISO. Omit (with sensorExposureTimeNs) for an auto-AE shot.
  sensorSensitivity?: number;
};

// Request payload for captureSession(). See its docstring below.
export type CaptureSessionRequest = {
  // How many auto-AE frames to shoot in rapid succession at the head
  // of the session. AE + AWB are locked before this burst so all
  // frames share sensor state (necessary for downstream averaging).
  // Set 0 to skip the burst entirely.
  burstCount: number;
  // Manual-exposure shots to shoot after the burst, in order. Each
  // shot's (iso, shutterNs) are applied together. Empty list is OK
  // (burst-only session).
  manualShots: SessionShot[];
};

// Static caps of the currently-bound back camera. Query once at UI
// mount so the JS-side widgets know what values are legal. Widgets
// should refuse to submit out-of-range values.
export type CaptureCapabilities = {
  // Integer inclusive range for CONTROL_AE_EXPOSURE_COMPENSATION.
  aeCompensationMin: number;
  aeCompensationMax: number;
  // CONTROL_AE_COMPENSATION_STEP as num/den (usually 1/2 or 1/3).
  aeCompensationStepNum: number;
  aeCompensationStepDen: number;
  // Manual sensor exposure-time bounds (nanoseconds). Zero on both
  // ends means the device doesn't advertise SENSOR_INFO_EXPOSURE_TIME_RANGE.
  sensorExposureTimeMinNs: number;
  sensorExposureTimeMaxNs: number;
  // Manual sensitivity (ISO) bounds. Zero means unknown.
  sensorSensitivityMin: number;
  sensorSensitivityMax: number;
};

// Android-only RAW capture API. Companion to the native RawCameraAndroidView
// (a Fabric view manager) which owns the CameraX Preview surface — the
// two share a single CameraX session under the hood, bound at the module
// level. The imperative capture control lives here so JS doesn't need to
// grab a ref to the view.
export interface RawCameraAndroid
  extends HybridObject<{android: 'kotlin'}> {
  /**
   * Trigger a full-resolution RAW capture on the currently-bound back
   * camera. Resolves once the DNG has been written to disk. Rejects if
   * the session isn't bound, the device doesn't support RAW_SENSOR, or
   * the DngCreator write fails.
   */
  capturePhoto(options: CaptureOptions): Promise<CapturedPhoto>;

  /**
   * Capture N frames in rapid succession with AE + AWB locked, so all
   * frames share identical sensor state (necessary for downstream
   * averaging to actually reduce noise instead of mixing inconsistent
   * exposures). Returns one CapturedPhoto per frame in order. Filenames
   * encode the burst id + frame index so downstream tooling can group
   * them. See docs/munsell-dark-sensor.md option #3.
   */
  captureBurst(count: number, options: CaptureOptions): Promise<CapturedPhoto[]>;

  /**
   * Fetches the currently-bound back camera's exposure-control ranges
   * so the JS-side widgets can display them and clamp user input.
   * Rejects if the session isn't bound yet.
   */
  getCaptureCapabilities(): Promise<CaptureCapabilities>;

  /**
   * Research-data-collection shutter: fires N auto-AE burst frames
   * (with AE+AWB locked so they're identical) followed by M manual
   * shots at explicit (iso, shutter) tuples. All files are written to
   * the phone's public Downloads folder under
   * `soilcap/session_<yyyyMMdd_HHmmss>/`, with filenames encoding the
   * shot type + parameters so `adb pull` off-device gives self-labelled
   * data ready for offline analysis. See docs/munsell-multishot.md.
   *
   * Returns one CapturedPhoto per shot in the order (burst 1..N, then
   * manual 1..M). Resolves after all shots are on disk.
   */
  captureSession(request: CaptureSessionRequest): Promise<CapturedPhoto[]>;
}
