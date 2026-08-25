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

// Fixed 2-box viewport-hint layout for the "calibrate a new reference"
// flow. Both boxes are in display-space fractional coordinates relative
// to the SensorAspectFrame (portrait 3:4), so the same numbers drive:
//   - the on-camera overlay drawn by AndroidRawCaptureScreen
//     (visual framing hint at shutter time), and
//   - the pre-populated refCrop/sampleCrop the CalibrateReferenceScreen
//     seeds into rawAnalysisSession (so the user can hit "Calibrate &
//     Save" without a manual crop pick).
//
// Layout: EXISTING on top, NEW on the bottom, centered horizontally,
// with a gap between so the labels don't collide with the borders.
// The `size` is expressed as w × h in the same fraction system.

export type CalibrateRoi = {
  label: string;
  roi: {x: number; y: number; w: number; h: number};
};

// IMPORTANT: these fractions must match the hardcoded rects in
// modules/raw-camera-android/.../RoiOverlayView.kt (refRect,
// sampleRect) so the native red/green analyser outline (which draws
// its OWN box at those coords) lines up with our JS labels. When
// task #78 lands (JS-tunable ROI positions), remove the native
// hardcode and drive both from this constant.
export const CALIBRATE_ROIS: readonly [CalibrateRoi, CalibrateRoi] = [
  {label: 'EXISTING REF', roi: {x: 0.15, y: 0.1, w: 0.7, h: 0.3}},
  {label: 'NEW REF', roi: {x: 0.15, y: 0.55, w: 0.7, h: 0.3}},
];

// Convenience accessors so callers don't index into the array by
// position — protects against a future re-ordering.
export const CALIBRATE_EXISTING_ROI = CALIBRATE_ROIS[0].roi;
export const CALIBRATE_NEW_ROI = CALIBRATE_ROIS[1].roi;
