import type {HybridObject} from 'react-native-nitro-modules';

// Result of a single DNG capture. `dngPath` is a file:// URI to the
// on-disk DNG written via android.hardware.camera2.DngCreator. `width`
// and `height` are the sensor's active array dimensions (pre-orientation
// tag) — the caller may need to swap them depending on the EXIF
// Orientation tag CameraX embeds. See docs/raw-camera-plan.md phase 7.
export type CapturedPhoto = {
  dngPath: string;
  width: number;
  height: number;
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
  capturePhoto(): Promise<CapturedPhoto>;
}
