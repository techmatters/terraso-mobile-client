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

// Dev-only, MMKV-persisted flag. When on (and not a production build), the app
// keeps the device awake while it is in the FOREGROUND — see DevKeepAwake.
// Handy for long on-device tests / Auto soaks and so a native rebuild can
// install without the phone having to be unlocked first. iOS honours
// isIdleTimerDisabled only while the app is foregrounded, so backgrounding or
// closing the app always restores normal auto-lock — no global setting is
// touched. Independent of the experimental RAW-colour flag (a general dev aid).
const KEY = 'keepAwakeDevEnabled';

export const getKeepAwakeDevEnabled = (): boolean =>
  kvStorage.getBool(KEY) ?? false;

export const setKeepAwakeDevEnabled = (enabled: boolean): void => {
  kvStorage.setBool(KEY, enabled);
  listeners.forEach(fn => fn());
};

// Pub-sub so useSyncExternalStore re-renders subscribers (the settings row, the
// DevKeepAwake activator) the moment the flag toggles.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useIsKeepAwakeDevEnabled = (): boolean =>
  useSyncExternalStore(subscribe, getKeepAwakeDevEnabled);
