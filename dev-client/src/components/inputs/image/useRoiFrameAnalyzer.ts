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

import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// ROI definitions + helpers for the RAW color capture flow: the preset
// rectangles (persisted selection) and the display→sensor rotation worklet.
// (The live frame-processor hook that used to live here moved into
// RawColorCamera's iOS engine — useIosFrameAnalyzer — when iOS adopted the
// shared RawColorCamera API; this module now just holds the ROI data + math.)

export type FractionalRoi = {x: number; y: number; w: number; h: number};

// Discrete set of ROI sizes the capture UI lets the user cycle
// through. Each preset defines both the Ref (top) and Sample (bottom)
// rectangles in **display** coordinates (portrait sensor-aspect
// frame — SensorAspectFrame that RoiOverlay + Camera share).
// Constraints per preset:
//   - Two rectangles stacked vertically, always centered horizontally
//   - Sample.y ≥ Ref.y + Ref.h + gap (visible separator between them)
//   - Ref.y ≥ 0 and Sample.y + Sample.h ≤ 1 (fit inside the frame)
//
// Add / reorder entries here to change what the size-selector buttons
// offer — the UI reads `ROI_PRESETS.length` and doesn't care how many
// there are. Keep the array sorted small → large so the +/- buttons'
// "shrink" / "grow" affordance stays consistent.
export type RoiPreset = {
  label: string;
  ref: FractionalRoi;
  sample: FractionalRoi;
};

export const ROI_PRESETS: readonly RoiPreset[] = [
  {
    label: 'tiny',
    ref: {x: 0.35, y: 0.3, w: 0.3, h: 0.16},
    sample: {x: 0.35, y: 0.54, w: 0.3, h: 0.16},
  },
  {
    label: 'small',
    ref: {x: 0.25, y: 0.2, w: 0.5, h: 0.25},
    sample: {x: 0.25, y: 0.55, w: 0.5, h: 0.25},
  },
  {
    label: 'medium',
    ref: {x: 0.15, y: 0.05, w: 0.7, h: 0.4},
    sample: {x: 0.15, y: 0.55, w: 0.7, h: 0.4},
  },
  {
    label: 'large',
    ref: {x: 0.075, y: 0.0, w: 0.85, h: 0.45},
    sample: {x: 0.075, y: 0.55, w: 0.85, h: 0.45},
  },
];

export const DEFAULT_ROI_PRESET_INDEX = 2; // medium

// Persisted between captures. Any component that needs to know the
// active ROIs (RawCameraView overlay, useRoiFrameAnalyzer, the
// downstream analysis screen) reads from kvStorage so they stay in
// sync without threading state through the app.
const ROI_PRESET_INDEX_KEY = 'roiCapture.presetIndex';

export const getActiveRoiPresetIndex = (): number => {
  const stored = kvStorage.getNumber(ROI_PRESET_INDEX_KEY);
  if (
    typeof stored === 'number' &&
    Number.isInteger(stored) &&
    stored >= 0 &&
    stored < ROI_PRESETS.length
  ) {
    return stored;
  }
  return DEFAULT_ROI_PRESET_INDEX;
};

export const setActiveRoiPresetIndex = (i: number): void => {
  if (i < 0 || i >= ROI_PRESETS.length) return;
  kvStorage.setNumber(ROI_PRESET_INDEX_KEY, i);
};

export const getActiveRoiPreset = (): RoiPreset =>
  ROI_PRESETS[getActiveRoiPresetIndex()];

// Backward-compat aliases for callers that don't yet plumb the active
// preset through. Point at the DEFAULT (medium) preset so behaviour
// matches pre-preset expectations.
export const DISPLAY_REF_ROI = ROI_PRESETS[DEFAULT_ROI_PRESET_INDEX].ref;
export const DISPLAY_SAMPLE_ROI = ROI_PRESETS[DEFAULT_ROI_PRESET_INDEX].sample;

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
export function rotateDisplayRoiToSensor(
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
