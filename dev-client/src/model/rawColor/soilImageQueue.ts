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

// MMKV-backed queue of soil-colour captures waiting to be uploaded to S3.
// Captured on the soil-colour picture-taking screens, drained by a one-at-a-
// time uploader (not in this file — this file is the pure data layer).
//
// Dedup rule (from color-final-plan.md): one entry per (siteId, depth.start,
// depth.end). If the user re-captures for the same site+depth before the
// previous entry uploaded, the older entry is discarded and the files it
// owned are deleted — "only the latest is kept". The queue itself is the
// source of truth for what's pending; successful upload removes the entry.

/** Media-type the S3 presigned URL expects — must match the upload PUT. */
export type SoilImageContentType = 'image/x-adobe-dng' | 'image/jpeg';

export type SoilImageFileKind = 'raw' | 'jpeg';

/** One underlying file in a queued entry. A capture can produce either (raw
 *  only, jpeg only) or both (RAW + companion JPEG). */
export type SoilImageFile = {
  kind: SoilImageFileKind;
  /** file:// URI into app cache (or wherever the capture saved it). */
  uri: string;
  contentType: SoilImageContentType;
};

export type SoilImageDepth = {
  /** Depth interval start, cm. */
  start: number;
  /** Depth interval end, cm. */
  end: number;
};

export type SoilImageQueueStatus = 'queued' | 'uploading' | 'failed';

export type SoilImageQueueEntry = {
  /** Stable UUID, assigned at enqueue time. Survives status transitions. */
  id: string;
  siteId: string;
  /** Denormalised site label so the UI doesn't have to join against live site
   *  state (which may have changed between capture and upload). */
  siteName: string;
  depth: SoilImageDepth;
  files: SoilImageFile[];
  /** Epoch ms of the enqueue. Used to pick the oldest `queued` for upload. */
  createdAt: number;
  status: SoilImageQueueStatus;
  /** Populated when status === 'failed'. */
  failureReason?: string;
};

/** What a caller supplies to enqueue — id/createdAt/status are stamped. */
export type NewSoilImageQueueEntry = Omit<
  SoilImageQueueEntry,
  'id' | 'createdAt' | 'status' | 'failureReason'
>;

/** Injected filesystem seam — only what the queue needs. Real implementation
 *  passes an expo-file-system wrapper; tests pass a stub. */
export interface SoilImageFileSystem {
  deleteFile(uri: string): Promise<void>;
}

/**
 * Factory inputs — matches the rawCaptureStore split: inject fs, storage
 * (read/write index), clock (now), and id generator. Default wiring lives in
 * soilImageQueue.default.ts; tests pass in-memory stubs so the data logic is
 * exercisable without MMKV / expo-file-system / uuid native deps.
 */
export type SoilImageQueueDeps = {
  fs: SoilImageFileSystem;
  readIndex: () => SoilImageQueueEntry[];
  writeIndex: (next: SoilImageQueueEntry[]) => void;
  now: () => number;
  newId: () => string;
};

const dedupKey = (siteId: string, depth: SoilImageDepth): string =>
  `${siteId}#${depth.start}#${depth.end}`;

const entryKey = (e: SoilImageQueueEntry): string =>
  dedupKey(e.siteId, e.depth);

/**
 * Factory. Default-wired instance for the running app lives in
 * `soilImageQueue.default.ts` (mirrors rawCaptureStore). Tests inject
 * in-memory stubs for every seam.
 */
export const createSoilImageQueue = (deps: SoilImageQueueDeps) => {
  const {fs, readIndex, writeIndex, now, newId} = deps;

  // In-process listeners so React hooks (useSoilImageQueue, bound to the
  // default-wired instance) re-render on mutation. Writes from a non-default
  // instance wouldn't fire listeners from another instance — intentional,
  // every instance has its own subscriber set.
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(fn => fn());
  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  };
  const deleteFiles = async (files: SoilImageFile[]): Promise<void> => {
    for (const f of files) {
      try {
        await fs.deleteFile(f.uri);
      } catch {
        // Best-effort: the file may already be gone (OS cache eviction, user
        // cleared data, etc). Not worth surfacing.
      }
    }
  };

  /** Enqueue, replacing (and deleting the files of) any pre-existing entry
   *  for the same (siteId, depth). Returns the new entry. */
  const enqueue = async (
    input: NewSoilImageQueueEntry,
  ): Promise<SoilImageQueueEntry> => {
    const key = dedupKey(input.siteId, input.depth);
    const existing = readIndex();
    const prior = existing.find(e => entryKey(e) === key);
    if (prior) {
      await deleteFiles(prior.files);
    }
    const newEntry: SoilImageQueueEntry = {
      ...input,
      id: newId(),
      createdAt: now(),
      status: 'queued',
    };
    const next = [...existing.filter(e => entryKey(e) !== key), newEntry];
    writeIndex(next);
    notify();
    return newEntry;
  };

  /** Drop everything from the queue AND delete all file bytes. */
  const clear = async (): Promise<void> => {
    const current = readIndex();
    const files = current.flatMap(e => e.files);
    writeIndex([]);
    notify();
    await deleteFiles(files);
  };

  /** Drop one entry (e.g. after a successful upload) and delete its files. */
  const remove = async (id: string): Promise<void> => {
    const current = readIndex();
    const target = current.find(e => e.id === id);
    if (!target) {
      return;
    }
    writeIndex(current.filter(e => e.id !== id));
    notify();
    await deleteFiles(target.files);
  };

  const setStatus = (
    id: string,
    status: SoilImageQueueStatus,
    failureReason?: string,
  ): void => {
    const current = readIndex();
    let changed = false;
    const next = current.map(e => {
      if (e.id !== id) {
        return e;
      }
      changed = true;
      const patched: SoilImageQueueEntry = {...e, status};
      // Clear the failure reason on any non-failed transition; set it on
      // transition INTO failed (callers should pass one in that case).
      if (status === 'failed') {
        patched.failureReason = failureReason;
      } else {
        delete patched.failureReason;
      }
      return patched;
    });
    if (!changed) {
      return;
    }
    writeIndex(next);
    notify();
  };

  const markUploading = (id: string): void => setStatus(id, 'uploading');
  const markQueued = (id: string): void => setStatus(id, 'queued');
  const markFailed = (id: string, reason: string): void =>
    setStatus(id, 'failed', reason);

  /** Oldest entry that's still `queued`. Used by the one-at-a-time uploader
   *  to pick what to send next. Null when nothing is queued. */
  const nextQueued = (): SoilImageQueueEntry | null => {
    const queued = readIndex()
      .filter(e => e.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);
    return queued[0] ?? null;
  };

  return {
    enqueue,
    clear,
    remove,
    markUploading,
    markQueued,
    markFailed,
    nextQueued,
    subscribe,
    list: () => readIndex(),
  };
};

export type SoilImageQueue = ReturnType<typeof createSoilImageQueue>;
