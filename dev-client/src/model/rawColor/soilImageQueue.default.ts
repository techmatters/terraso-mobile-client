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

import {File} from 'expo-file-system';

import {v4 as uuidv4} from 'uuid';

import {
  createSoilImageQueue,
  SoilImageFileSystem,
  SoilImageQueueEntry,
} from 'terraso-mobile-client/model/rawColor/soilImageQueue';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// Default-wired soil-image queue for the running app. Pairs the pure
// createSoilImageQueue core with MMKV persistence, expo-file-system file
// deletion, Date.now() + uuidv4 for ids. Tests use the core directly with
// their own stubs so the data logic is exercisable without native deps.

const KEY = 'colorCamera.soilImageQueue';
type PersistedShape = {items: SoilImageQueueEntry[]};

const readIndex = (): SoilImageQueueEntry[] =>
  kvStorage.getObject<PersistedShape>(KEY)?.items ?? [];

const writeIndex = (items: SoilImageQueueEntry[]): void => {
  kvStorage.setObject(KEY, {items} satisfies PersistedShape);
};

const fs: SoilImageFileSystem = {
  deleteFile: async (uri: string) => {
    // File#delete is synchronous in expo-file-system v58+; the async wrapper
    // keeps the queue's contract consistent. Missing files are best-effort
    // (handled by the caller swallowing).
    new File(uri).delete();
  },
};

export const soilImageQueue = createSoilImageQueue({
  fs,
  readIndex,
  writeIndex,
  now: () => Date.now(),
  newId: () => uuidv4(),
});

// Startup recovery: any entry persisted with status `uploading` at module
// load time was in-flight when the app was last killed (crash, OS kill, user
// swipe-away). Partial PUTs are treated as failures per
// docs/color-final-plan.md — flip them so the user can see what didn't
// finish and retry via the Upload button.
for (const entry of readIndex()) {
  if (entry.status === 'uploading') {
    soilImageQueue.markFailed(entry.id, 'Upload interrupted');
  }
}

// Snapshot cached so useSyncExternalStore can hand React the SAME reference
// between calls when nothing changed. Refreshed only on mutation (the queue
// factory notifies subscribers after every write).
let snapshot: SoilImageQueueEntry[] = soilImageQueue.list();
const snapshotListeners = new Set<() => void>();
soilImageQueue.subscribe(() => {
  snapshot = soilImageQueue.list();
  snapshotListeners.forEach(fn => fn());
});

/** React hook — subscribes to queue changes on the default-wired instance. */
export const useSoilImageQueue = (): SoilImageQueueEntry[] =>
  useSyncExternalStore(
    fn => {
      snapshotListeners.add(fn);
      return () => {
        snapshotListeners.delete(fn);
      };
    },
    () => snapshot,
  );
