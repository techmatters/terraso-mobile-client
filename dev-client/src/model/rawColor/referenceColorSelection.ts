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

import {useCallback, useSyncExternalStore} from 'react';

import {
  findReference,
  listAvailableReferences,
  ReferenceColor,
} from 'terraso-mobile-client/model/rawColor/referenceColors';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// MMKV-backed sticky reference-color selection. One per device; the
// Picture-Taking screen's reference-color dropdown reads + writes this so the
// user's last choice persists across captures / app restarts. Kept separate
// from the Redux preferences slice because the catalog of references is
// ephemeral UI state, not synced-to-backend user preferences.

const KEY = 'colorCamera.selectedReferenceId';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/**
 * Default reference when nothing is persisted yet: the first entry that
 * ISN'T flagged as notRecommended. Falls back to the first entry if every
 * entry happens to be flagged (shouldn't happen in practice).
 */
const defaultReferenceId = (): string | undefined => {
  const refs = listAvailableReferences();
  return (refs.find(r => !r.notRecommended) ?? refs[0])?.id;
};

export const getSelectedReferenceId = (): string | undefined =>
  kvStorage.getString(KEY) ?? defaultReferenceId();

export const setSelectedReferenceId = (id: string): void => {
  kvStorage.setString(KEY, id);
  notify();
};

/**
 * Resolves the currently-selected reference to the full ReferenceColor
 * object, re-rendering subscribed components when the selection changes OR
 * when the catalog changes (not today, but once custom refs land). Returns
 * undefined only if the catalog is empty.
 */
export const useSelectedReference = (): {
  reference: ReferenceColor | undefined;
  setReferenceId: (id: string) => void;
} => {
  const id = useSyncExternalStore(subscribe, getSelectedReferenceId);
  const reference = id ? findReference(id) : undefined;
  const setReferenceId = useCallback(setSelectedReferenceId, []);
  return {reference, setReferenceId};
};
