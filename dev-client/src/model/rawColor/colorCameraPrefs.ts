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

// MMKV-persisted Color/Camera toggles exposed in Settings → Color/Camera
// (DEV-only section). Both boolean, both gate behaviour of the soil-colour
// capture pipeline. Kept independent of the PostHog feature flags so they can
// be flipped on a device without changing flag state.
//
// - useRawWhenAvailable (default true): when a device supports RAW and this
//   is on, the capture pipeline produces RAW+JPEG and uses RAW for colour
//   extraction. When off, forces the jpeg-only path even on RAW-capable
//   devices (equivalent to the dev screen's "Simulate no RAW" toggle but for
//   the real soil-colour flow).
// - useNewPreviewUx (default false): when on, soil-colour capture goes
//   through the new live-preview + ROI-analyzer UX (rawColorCamera.tsx) on
//   both RAW and non-RAW paths, instead of the existing pick-image-then-crop
//   flow.

const KEY_RAW_WHEN_AVAILABLE = 'colorCamera.useRawWhenAvailable';
const KEY_NEW_PREVIEW_UX = 'colorCamera.useNewPreviewUx';

const DEFAULT_RAW_WHEN_AVAILABLE = true;
const DEFAULT_NEW_PREVIEW_UX = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getUseRawWhenAvailable = (): boolean =>
  kvStorage.getBool(KEY_RAW_WHEN_AVAILABLE) ?? DEFAULT_RAW_WHEN_AVAILABLE;

export const setUseRawWhenAvailable = (enabled: boolean): void => {
  kvStorage.setBool(KEY_RAW_WHEN_AVAILABLE, enabled);
  notify();
};

export const useUseRawWhenAvailable = (): boolean =>
  useSyncExternalStore(subscribe, getUseRawWhenAvailable);

export const getUseNewPreviewUx = (): boolean =>
  kvStorage.getBool(KEY_NEW_PREVIEW_UX) ?? DEFAULT_NEW_PREVIEW_UX;

export const setUseNewPreviewUx = (enabled: boolean): void => {
  kvStorage.setBool(KEY_NEW_PREVIEW_UX, enabled);
  notify();
};

export const useUseNewPreviewUx = (): boolean =>
  useSyncExternalStore(subscribe, getUseNewPreviewUx);
