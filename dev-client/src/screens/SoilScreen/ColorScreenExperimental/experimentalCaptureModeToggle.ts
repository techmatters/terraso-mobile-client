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

import {useSyncExternalStore} from 'react';

import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// Which capture pipeline the experimental ColorScreen uses.
//   'jpeg'     — expo-image-picker → JPEG → correctSampleRGB (current
//                path, matches production behavior)
//   'raw'      — RawCameraView → DNG → DngDecoderHybrid → linear-sRGB.
//                Same DNG capture as 'raw-live' below, minus the overlay.
//   'raw-live' — like 'raw' but with the phase-8 real-time ROI analyzer
//                overlay mounted on top of the preview. iOS today; on
//                Android the overlay is currently always-on regardless
//                (see task #78).
export type ExperimentalCaptureMode = 'jpeg' | 'raw' | 'raw-live';

const KEY = 'experimentalCaptureMode';
const DEFAULT: ExperimentalCaptureMode = 'jpeg';

export const getExperimentalCaptureMode = (): ExperimentalCaptureMode => {
  const stored = kvStorage.getString(KEY);
  if (stored === 'raw' || stored === 'raw-live') return stored;
  return DEFAULT;
};

export const setExperimentalCaptureMode = (
  mode: ExperimentalCaptureMode,
): void => {
  kvStorage.setString(KEY, mode);
  listeners.forEach(fn => fn());
};

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useExperimentalCaptureMode = (): ExperimentalCaptureMode =>
  useSyncExternalStore(subscribe, getExperimentalCaptureMode);
