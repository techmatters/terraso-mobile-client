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

import {v4 as uuidv4} from 'uuid';

import {LinearRgb} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// MMKV-backed store of user-calibrated reference cards for the
// experimental RAW color-analysis pipeline. See phase 6 in
// docs/raw-camera-plan.md. Predefined references live in
// LINEAR_REFERENCES (source code, cannot be deleted); custom
// references are added here via the Settings → Calibrate flow and
// merged into the picker's list at rank time.
//
// Storage shape: a single JSON blob under one key, containing an array
// of entries. Chosen over per-key entries because MMKV's per-key
// enumeration isn't exposed by our kvStorage wrapper and the list is
// expected to stay small (dozens at most, not thousands).

export type CustomReference = {
  id: string;
  name: string;
  linearRgb: LinearRgb;
  // Free-form illuminant note the user typed at calibration time
  // ("kitchen daylight ~4pm cloudy"). Displayed in the manage-list
  // and shown in the picker so testers can spot obvious mismatches.
  calibratedUnder?: string;
  createdAt: number;
};

type PersistedShape = {items: CustomReference[]};

const KEY = 'customColorReferences';

const readAll = (): CustomReference[] =>
  kvStorage.getObject<PersistedShape>(KEY)?.items ?? [];

const writeAll = (items: CustomReference[]): void => {
  kvStorage.setObject(KEY, {items} satisfies PersistedShape);
};

// Cached snapshot required by useSyncExternalStore — must return the
// same reference between calls when nothing changed, or React will
// treat every render as a mutation and infinite-loop. Refreshed only
// when a mutation notifies.
let snapshot: CustomReference[] = readAll();
const listeners = new Set<() => void>();

const notifyChanged = (): void => {
  snapshot = readAll();
  listeners.forEach(fn => fn());
};

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const getSnapshot = (): CustomReference[] => snapshot;

export const listCustomReferences = (): CustomReference[] => snapshot;

export const saveCustomReference = (
  input: Omit<CustomReference, 'id' | 'createdAt'>,
): CustomReference => {
  const created: CustomReference = {
    ...input,
    id: uuidv4(),
    createdAt: Date.now(),
  };
  writeAll([...readAll(), created]);
  notifyChanged();
  return created;
};

export const deleteCustomReference = (id: string): void => {
  writeAll(readAll().filter(r => r.id !== id));
  notifyChanged();
};

export const useCustomReferences = (): CustomReference[] =>
  useSyncExternalStore(subscribe, getSnapshot);
