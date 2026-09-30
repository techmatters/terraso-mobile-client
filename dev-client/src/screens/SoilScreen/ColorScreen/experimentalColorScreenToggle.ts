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

// MMKV-persisted flag controlling whether the color-analysis route uses
// the dev-only ColorScreenExperimental copy instead of the production
// ColorScreen. Gated at the UI level by FF_testing, but this key exists
// independent of feature flags so it can be flipped without changing
// flag state.
const KEY = 'useExperimentalColorScreen';

export const getExperimentalColorScreenEnabled = (): boolean =>
  kvStorage.getBool(KEY) ?? false;

export const setExperimentalColorScreenEnabled = (enabled: boolean): void => {
  kvStorage.setBool(KEY, enabled);
  listeners.forEach(fn => fn());
};

// Simple pub-sub so useSyncExternalStore below re-renders subscribed
// components (settings row, router) the moment the flag is toggled.
// Setting the flag from another process wouldn't fire this — acceptable
// since only this app writes it.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useIsExperimentalColorScreenEnabled = (): boolean =>
  useSyncExternalStore(subscribe, getExperimentalColorScreenEnabled);
