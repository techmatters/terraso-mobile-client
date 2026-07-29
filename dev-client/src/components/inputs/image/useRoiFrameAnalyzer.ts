/*
 * Copyright © 2026 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {useSharedValue} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import {useFrameOutput} from 'react-native-vision-camera';

import {FrameAnalyzerHybrid} from 'frame-analyzer';

// Phase-8.4 iOS real-time analyzer. Wraps vision-camera's useFrameOutput
// with a worklet that runs the Nitro-hosted C++ Y-plane analyzer for two
// hardcoded ROIs and publishes per-ROI colour codes to shared values the
// overlay reads via reanimated.
//
// The ROIs are baked into this hook for phase 8.4 first cut (same
// hardcoded pair as Android phase 8.2). Phase 8.3-equivalent will let JS
// callers pass them in and drive both the overlay + analyzer from a
// single source.

// Variance value at which "match quality" bottoms out to 0.
// Anything at or below this variance maps linearly to a bar-fill from
// 1.0 (variance=0, perfectly uniform) down to 0.0 (variance≥MAX). Also
// the border-flip threshold: quality > 0 → green, quality == 0 → red.
//
// Value in squared-luma units. Standard deviation (√var) is on the
// 0..255 luma scale and is easier to reason about: MAX_VARIANCE=500 →
// std ≈ 22, i.e. ~9% of the full range. Truly uniform surfaces typically
// come in around std 5..15 (var 25..225); a real card with fibre or a
// slight shadow gradient sits in std 15..25 (var 225..625). 500 keeps
// good-in-practice framings inside the green band; earlier value of
// 200 was aggressive enough that even nicely-framed cards read red.
const MAX_VARIANCE = 500;

// Fractional ROIs in **display** coordinates. Same rectangles the overlay
// uses. Worklet rotates them into sensor coordinates using
// `frame.orientation`.
export const DISPLAY_REF_ROI = {x: 0.15, y: 0.1, w: 0.7, h: 0.3};
export const DISPLAY_SAMPLE_ROI = {x: 0.15, y: 0.55, w: 0.7, h: 0.3};

type FractionalRoi = {x: number; y: number; w: number; h: number};

// Rotate a display-space fractional ROI into sensor-space fractional
// coordinates, according to the frame's `orientation` — vision-camera's
// term for "how the sensor pixel data is rotated relative to display-up".
//
// Derivation for 'right' (the common iPhone-rear-cam portrait case):
// vision-camera says pixel data is +90° from desired display, so to
// reach display we rotate the sensor CCW 90°. That maps:
//   - sensor top edge     → display LEFT edge
//   - sensor right edge   → display TOP edge
//   - sensor bottom edge  → display RIGHT edge
//   - sensor left edge    → display BOTTOM edge
// which gives, for a display rect {x, y, w, h}:
//   sensor_x = 1 - y - h,  sensor_y = x,  sensor_w = h,  sensor_h = w
//
// The other cases follow by analogous derivations.
function rotateDisplayRoiToSensor(
  roi: FractionalRoi,
  orientation: 'up' | 'right' | 'down' | 'left',
): FractionalRoi {
  'worklet';
  switch (orientation) {
    case 'up':
      return roi;
    case 'right':
      return {x: 1 - roi.y - roi.h, y: roi.x, w: roi.h, h: roi.w};
    case 'down':
      return {x: 1 - roi.x - roi.w, y: 1 - roi.y - roi.h, w: roi.w, h: roi.h};
    case 'left':
      return {x: roi.y, y: 1 - roi.x - roi.w, w: roi.h, h: roi.w};
  }
}

export type UseRoiFrameAnalyzerResult = {
  frameOutput: ReturnType<typeof useFrameOutput>;
  // Match-quality per ROI as a 0..1 SharedValue. 0 means "too much
  // variance to trust", 1 means "perfectly uniform". RoiOverlay uses
  // it for both bar fill and border colour.
  refQuality: SharedValue<number>;
  sampleQuality: SharedValue<number>;
};

export function useRoiFrameAnalyzer(): UseRoiFrameAnalyzerResult {
  const refQuality = useSharedValue(0);
  const sampleQuality = useSharedValue(0);
  // Frame counter for the throttled debug log below. Shared across
  // worklet runs via SharedValue so the worklet-side increment sticks.
  const frameCounter = useSharedValue(0);

  const frameOutput = useFrameOutput({
    // Both settings below preserve RAW-capture compatibility on iOS.
    // Adding a frame output can force vision-camera to pick an
    // AVCaptureDeviceFormat that supports video streaming but not RAW
    // photo capture, breaking DNG capture with a "PhotoOutput does not
    // support raw capture" error. Two mitigations:
    //   - `pixelFormat: 'native'` (the default): don't force a YUV
    //     conversion that might rule out RAW-capable Formats. iPhone
    //     rear-cam native pixel format is YCbCr biplanar, which the
    //     analyzer still reads via getPlanes()[0].
    //   - `enablePreviewSizedOutputBuffers: true`: piggyback on the
    //     preview surface's buffer instead of allocating a separate
    //     video-stream size that would constrain Format selection.
    pixelFormat: 'native',
    enablePreviewSizedOutputBuffers: true,
    onFrame: frame => {
      'worklet';
      try {
        if (!frame.isPlanar) return;
        const planes = frame.getPlanes();
        if (planes.length === 0) return;
        const yPlane = planes[0];
        const buf = yPlane.getPixelBuffer();
        const w = yPlane.width;
        const h = yPlane.height;
        const stride = yPlane.bytesPerRow;
        const refSensor = rotateDisplayRoiToSensor(
          DISPLAY_REF_ROI,
          frame.orientation,
        );
        const sampleSensor = rotateDisplayRoiToSensor(
          DISPLAY_SAMPLE_ROI,
          frame.orientation,
        );
        const refStats = FrameAnalyzerHybrid.analyzeYPlane(
          buf,
          stride,
          w,
          h,
          Math.round(refSensor.x * w),
          Math.round(refSensor.y * h),
          Math.round(refSensor.w * w),
          Math.round(refSensor.h * h),
        );
        const sampleStats = FrameAnalyzerHybrid.analyzeYPlane(
          buf,
          stride,
          w,
          h,
          Math.round(sampleSensor.x * w),
          Math.round(sampleSensor.y * h),
          Math.round(sampleSensor.w * w),
          Math.round(sampleSensor.h * h),
        );
        refQuality.value = Math.max(
          0,
          Math.min(1, 1 - refStats.variance / MAX_VARIANCE),
        );
        sampleQuality.value = Math.max(
          0,
          Math.min(1, 1 - sampleStats.variance / MAX_VARIANCE),
        );

        // Throttled debug dump: once every ~30 frames (~1s at 30fps).
        // Logs frame geometry + orientation + the actual sensor ROIs we
        // sampled + the computed variance/mean for both. Useful for
        // verifying rotateDisplayRoiToSensor and tuning the green
        // threshold. Remove once phase 8.4b is closed.
        const n = frameCounter.value + 1;
        frameCounter.value = n;
        if (n % 30 === 0) {
          // Report std (= √variance) instead of raw variance — std is
          // on the same 0..255 scale as luma itself so a value like
          // "12" reads directly as "±12 luma units around the mean",
          // whereas "144" for variance is opaque. Raw variance kept
          // in parens for anyone comparing against MAX_VARIANCE.
          const refStd = Math.sqrt(refStats.variance);
          const sampleStd = Math.sqrt(sampleStats.variance);
          console.log(
            `[phase8.4] frame ${w}x${h} orient=${frame.orientation} ` +
              `refSensor=(${Math.round(refSensor.x * w)},${Math.round(
                refSensor.y * h,
              )},${Math.round(refSensor.w * w)}x${Math.round(
                refSensor.h * h,
              )}) refMean=${refStats.mean.toFixed(
                1,
              )} refStd=${refStd.toFixed(1)} (var=${refStats.variance.toFixed(0)}) ` +
              `sampleSensor=(${Math.round(sampleSensor.x * w)},${Math.round(
                sampleSensor.y * h,
              )},${Math.round(sampleSensor.w * w)}x${Math.round(
                sampleSensor.h * h,
              )}) sampleMean=${sampleStats.mean.toFixed(
                1,
              )} sampleStd=${sampleStd.toFixed(1)} (var=${sampleStats.variance.toFixed(0)})`,
          );
        }
      } finally {
        frame.dispose();
      }
    },
  });

  return {frameOutput, refQuality, sampleQuality};
}
