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

import {cacheDirectory, deleteAsync} from 'expo-file-system/legacy';

import {
  createRawCaptureStore,
  keepLastN,
  RawCaptureStore,
  StoredCapture,
} from 'terraso-mobile-client/model/rawColor/rawCaptureStore';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// Placeholder retention: keep the last N captures. Age / total-size /
// free-space policies can replace this later (slice 2.3).
const KEEP_LAST_N = 10;

const INDEX_KEY = 'rawCaptureStore.index';

/** Subdirectory under the cache dir where capture files live. */
export const RAW_CAPTURE_SUBDIR = 'raw-captures/';

/**
 * Absolute file:// directory for capture files. Null if the platform doesn't
 * expose a cache dir (shouldn't happen on device). The capture flow writes
 * DNG/JPEG here and passes the URIs to `store.add`.
 */
export const rawCaptureDir = (): string | null =>
  cacheDirectory ? `${cacheDirectory}${RAW_CAPTURE_SUBDIR}` : null;

/**
 * Production store: index persisted in MMKV, files deleted via expo-file-system
 * (idempotent), keep-last-N eviction.
 */
export const defaultRawCaptureStore = (): RawCaptureStore =>
  createRawCaptureStore({
    fs: {
      deleteFile: async uri => {
        await deleteAsync(uri, {idempotent: true});
      },
    },
    readIndex: () =>
      kvStorage.getObject<StoredCapture[]>(INDEX_KEY) ??
      ([] as StoredCapture[]),
    writeIndex: index => kvStorage.setObject(INDEX_KEY, index),
    now: () => Date.now(),
    policy: keepLastN(KEEP_LAST_N),
  });
