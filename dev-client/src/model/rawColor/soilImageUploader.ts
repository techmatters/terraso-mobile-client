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

import * as terrasoApi from 'terraso-client-shared/terrasoApi/api';

import type {
  SoilImageContentType,
  SoilImageFileKind,
  SoilImageQueue,
  SoilImageQueueEntry,
} from 'terraso-mobile-client/model/rawColor/soilImageQueue';
import {soilImageQueue} from 'terraso-mobile-client/model/rawColor/soilImageQueue.default';

// Drains the Soil Images queue one entry at a time through the backend's
// presigned-URL flow (see terraso-backend docs/soil_image_upload_api.md):
//   (1) GraphQL `requestSoilImageUploadUrl` returns {uploadUrl, objectKey};
//   (2) HTTP PUT the file bytes with a matching Content-Type header, NO
//       Authorization header (the presigned URL carries its own).
//
// Per color-final-plan.md:
//   - Sequential only (one entry at a time).
//   - On success: queue.remove(id) → file deleted via queue's fs seam.
//   - On failure: queue.markFailed(id, reason); the entry stays visible so
//     the user can re-tap Upload to retry.
//   - A partial PUT caught by app-kill is handled by the queue's startup
//     recovery (uploading → failed('Upload interrupted')) in
//     soilImageQueue.default.ts.
//
// Scope note: the backend's Phase-1 API has NO confirm step and no DB
// record for the upload. All we get back is objectKey; we trust the 200 on
// the PUT as success and drop the local entry.

const UPLOAD_URL_MUTATION = /* GraphQL */ `
  mutation RequestSoilImageUploadUrl($input: SoilImageUploadUrlRequestInput!) {
    requestSoilImageUploadUrl(input: $input) {
      uploadUrl
      objectKey
      errors {
        message
      }
    }
  }
`;

// Backend accepts 1-32 chars of [A-Za-z0-9_-]. Pair convention from the
// plan: a RAW+JPEG capture maps to main-raw / main-jpeg; a jpeg-only
// capture maps to main-jpeg alone.
const uploadName = (kind: SoilImageFileKind): string =>
  kind === 'raw' ? 'main-raw' : 'main-jpeg';

type UploadUrlResponse = {
  uploadUrl: string | null;
  objectKey: string | null;
  errors?: Array<{message: string}> | null;
};

const requestUploadUrl = async (args: {
  siteId: string;
  depthStart: number;
  depthEnd: number;
  contentType: SoilImageContentType;
  name: string;
}): Promise<{uploadUrl: string; objectKey: string}> => {
  const response = (await terrasoApi.requestGraphQL(UPLOAD_URL_MUTATION, {
    input: {
      siteId: args.siteId,
      depthInterval: {start: args.depthStart, end: args.depthEnd},
      contentType: args.contentType,
      name: args.name,
    },
  })) as {requestSoilImageUploadUrl: UploadUrlResponse};
  const payload = response.requestSoilImageUploadUrl;
  if (!payload || payload.errors?.length) {
    throw new Error(
      payload?.errors?.[0]?.message ??
        'requestSoilImageUploadUrl returned no payload',
    );
  }
  if (!payload.uploadUrl || !payload.objectKey) {
    throw new Error('presigned URL request returned empty fields');
  }
  return {uploadUrl: payload.uploadUrl, objectKey: payload.objectKey};
};

const putFile = async (
  uploadUrl: string,
  fileUri: string,
  contentType: SoilImageContentType,
): Promise<void> => {
  // File#bytes returns the whole file in memory. For a 25MB iPhone DNG this
  // is fine (RN has plenty of headroom) and `fetch` body accepts a typed
  // array directly. If we ever need to stream large files, switch to an
  // expo-file-system uploadAsync (which uses NSURLSession / OkHttp
  // natively) and lose the in-memory slurp — not needed today.
  const bytes = await new File(fileUri).bytes();
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {'Content-Type': contentType},
    body: bytes,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `S3 PUT failed: ${response.status} ${response.statusText}${
        body ? ` — ${body.slice(0, 200)}` : ''
      }`,
    );
  }
};

/** Uploads every file in an entry under distinct `name` values. Throws on
 *  first failure so the caller can mark the whole entry failed. */
const uploadEntry = async (entry: SoilImageQueueEntry): Promise<void> => {
  for (const file of entry.files) {
    const {uploadUrl} = await requestUploadUrl({
      siteId: entry.siteId,
      depthStart: entry.depth.start,
      depthEnd: entry.depth.end,
      contentType: file.contentType,
      name: uploadName(file.kind),
    });
    await putFile(uploadUrl, file.uri, file.contentType);
  }
};

// Module-local scheduler state. There is exactly one app-wide uploader;
// trying to start a second while one is running is a no-op. Cancel is
// cooperative — the in-flight entry completes (whole entry rolled back to
// failed if we tripped mid-file).
let running = false;
let cancelRequested = false;
const runningListeners = new Set<() => void>();
const notifyRunning = () => {
  runningListeners.forEach(fn => fn());
};

export const subscribeToUploader = (fn: () => void): (() => void) => {
  runningListeners.add(fn);
  return () => {
    runningListeners.delete(fn);
  };
};

export const isUploaderRunning = (): boolean => running;

/**
 * Walks `queue.nextQueued()` sequentially:
 *  - markUploading → uploadEntry → remove (on success) / markFailed (on throw)
 *  - loops until no more `queued` entries OR cancelUpload() is called.
 *
 * Safe to call repeatedly; no-ops if already running. The returned promise
 * resolves when the drain finishes (nothing more queued, or cancelled).
 */
export const runSequentialUpload = async (
  queue: SoilImageQueue = soilImageQueue,
): Promise<void> => {
  if (running) {
    return;
  }
  running = true;
  cancelRequested = false;
  notifyRunning();
  try {
    while (!cancelRequested) {
      const next = queue.nextQueued();
      if (!next) {
        return;
      }
      queue.markUploading(next.id);
      try {
        await uploadEntry(next);
        await queue.remove(next.id);
      } catch (err) {
        console.warn('[soilImageUploader] entry failed', next.id, err);
        queue.markFailed(next.id, String(err));
      }
    }
  } finally {
    running = false;
    cancelRequested = false;
    notifyRunning();
  }
};

/** Requests the in-flight uploader to stop after the current entry. No-op
 *  when the uploader isn't running. */
export const cancelUpload = (): void => {
  if (running) {
    cancelRequested = true;
  }
};

/** React hook — subscribes to uploader running / idle flips. */
export const useIsUploaderRunning = (): boolean =>
  useSyncExternalStore(subscribeToUploader, isUploaderRunning);
