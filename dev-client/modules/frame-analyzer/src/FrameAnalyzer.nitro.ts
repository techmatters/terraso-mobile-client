import type {HybridObject} from 'react-native-nitro-modules';

export type RoiLumaStats = {
  // Mean Y-plane value in the ROI, 0..255.
  mean: number;
  // Variance in squared-luma units, 0..65025.
  variance: number;
  // Number of pixels sampled (roiW * roiH after plane clamp; 0 if ROI is
  // entirely outside the plane).
  count: number;
};

/**
 * Nitro-hosted per-ROI Y-plane analyzer for the phase-8 real-time overlay
 * on iOS. Callers (a vision-camera worklet inside RawCameraView) hand
 * over the Y plane as an ArrayBuffer + row stride + plane dimensions;
 * the native side calls the shared C++ analyzer.
 *
 * Passing the pixel buffer + geometry as primitives (rather than a
 * `Frame` reference) keeps this module free of a vision-camera
 * dependency — the C++ analyzer is pure Y-plane math, not vision-camera
 * -specific.
 *
 * iOS-only. Android's equivalent lives inside raw-camera-android because
 * that platform uses CameraX ImageAnalysis directly (bypassing
 * vision-camera). Both call the same shared C++ core (currently
 * duplicated — consolidate as a phase 8.4 follow-up).
 */
export interface FrameAnalyzer
  extends HybridObject<{ios: 'swift'}> {
  analyzeYPlane(
    yPlane: ArrayBuffer,
    rowStride: number,
    planeWidth: number,
    planeHeight: number,
    roiX: number,
    roiY: number,
    roiW: number,
    roiH: number,
  ): RoiLumaStats;
}
