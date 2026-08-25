import {ComponentType} from 'react';
import {Platform, requireNativeComponent, ViewProps} from 'react-native';

// Thin RN wrapper around the native RawCameraAndroidView (registered
// by RawCameraAndroidViewManager). Android-only — on iOS this renders
// nothing so cross-platform JS can Platform-gate without crashing on
// requireNativeComponent's warning-on-missing-component behavior.
export type RawCameraAndroidViewProps = ViewProps & {
  // When false, hides the native two-ROI overlay (phase-8 real-time
  // analyzer). Default true. Set false when a JS overlay (e.g. the
  // Munsell chart-guide rectangle) should own the framing UI.
  showRoiOverlay?: boolean;

  // When true, PreviewView uses FIT_CENTER (letterboxed 1:1 with the
  // captured DNG) instead of the default FILL_CENTER (cropped to
  // fill). Set true when a screen-space overlay needs pixel-accurate
  // alignment with the captured image — e.g. the Munsell chart
  // validator, where the guide rectangle must correspond to the same
  // fraction of the sensor image as it does of the on-screen preview.
  previewFitCenter?: boolean;

  // Per-ROI display-space fractional coords (0..1 relative to the
  // native view). Both the RoiOverlayView rectangles AND the per-frame
  // variance analyser's sample regions are driven from these — they
  // stay in sync so the red/green outline reflects the same region the
  // user sees framed. Defaults match the "medium" ROI_PRESETS entry.
  refRoiX?: number;
  refRoiY?: number;
  refRoiW?: number;
  refRoiH?: number;
  sampleRoiX?: number;
  sampleRoiY?: number;
  sampleRoiW?: number;
  sampleRoiH?: number;
};

const NativeRawCameraAndroidView: ComponentType<RawCameraAndroidViewProps> =
  Platform.OS === 'android'
    ? requireNativeComponent<RawCameraAndroidViewProps>('RawCameraAndroidView')
    : () => null;

export const RawCameraAndroidView = NativeRawCameraAndroidView;
