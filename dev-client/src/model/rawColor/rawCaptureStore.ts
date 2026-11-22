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

/**
 * Managed storage for RAW captures (DNG + optional companion JPEG) in a temp
 * directory, with a pluggable eviction policy so we don't grow the cache
 * without bound. This file is the pure, dependency-injected core — the actual
 * filesystem + persistence wiring lives in `rawCaptureStore.default.ts` so this
 * stays unit-testable with no native dependencies.
 */

/** One stored capture and the files backing it. */
export type StoredCapture = {
  /** Stable id (e.g. the capture file stem). */
  id: string;
  /** Epoch milliseconds the capture was added. */
  createdAt: number;
  /** file:// URI of the DNG, if a RAW capture. */
  dngUri?: string;
  /** file:// URI of the companion/preview JPEG, if present. */
  jpegUri?: string;
  /** Optional association to a site/soil sample (for later upload). */
  siteId?: string;
};

/** What a caller supplies when adding a capture (createdAt is stamped). */
export type NewCapture = Omit<StoredCapture, 'createdAt'>;

/** Minimal filesystem seam — only what the store needs. */
export interface CaptureFileSystem {
  deleteFile(uri: string): Promise<void>;
}

/**
 * Decides which captures to drop. Given the index sorted newest-first, returns
 * the ids to evict. Today we keep the last N; age / total-size / free-space
 * policies can implement this same interface later (see
 * docs/raw-capture-integration-plan.md, slice 2.3).
 */
export interface EvictionPolicy {
  selectForEviction(captures: StoredCapture[]): string[];
}

/** Keep the N newest captures; evict the rest. */
export const keepLastN = (n: number): EvictionPolicy => ({
  selectForEviction: captures => captures.slice(Math.max(0, n)).map(c => c.id),
});

export type RawCaptureStoreDeps = {
  fs: CaptureFileSystem;
  /** Load the persisted index (newest-first). */
  readIndex: () => StoredCapture[];
  /** Persist the index (newest-first). */
  writeIndex: (index: StoredCapture[]) => void;
  /** Current time in epoch ms (injectable for tests). */
  now: () => number;
  policy: EvictionPolicy;
};

export interface RawCaptureStore {
  /** Add a capture, then evict per policy (deleting evicted files). */
  add(capture: NewCapture): Promise<StoredCapture>;
  /** All captures, newest-first. */
  list(): StoredCapture[];
  get(id: string): StoredCapture | undefined;
  /** Remove every capture and delete its files. */
  clearAll(): Promise<void>;
}

export const createRawCaptureStore = (
  deps: RawCaptureStoreDeps,
): RawCaptureStore => {
  const deleteFilesFor = async (captures: StoredCapture[]): Promise<void> => {
    for (const c of captures) {
      // Best-effort: a missing file shouldn't wedge the index. Callers inject
      // an idempotent delete; we still guard so one failure doesn't strand the
      // rest.
      try {
        if (c.dngUri) {
          await deps.fs.deleteFile(c.dngUri);
        }
        if (c.jpegUri) {
          await deps.fs.deleteFile(c.jpegUri);
        }
      } catch {
        // swallow — eviction is opportunistic cleanup
      }
    }
  };

  return {
    list: () => deps.readIndex(),

    get: id => deps.readIndex().find(c => c.id === id),

    add: async capture => {
      const stored: StoredCapture = {...capture, createdAt: deps.now()};
      // Replace any prior entry with the same id, then prepend (newest-first).
      const withoutDup = deps.readIndex().filter(c => c.id !== capture.id);
      const next = [stored, ...withoutDup];

      const evictIds = new Set(deps.policy.selectForEviction(next));
      const kept = next.filter(c => !evictIds.has(c.id));
      const evicted = next.filter(c => evictIds.has(c.id));

      deps.writeIndex(kept);
      await deleteFilesFor(evicted);
      return stored;
    },

    clearAll: async () => {
      const all = deps.readIndex();
      deps.writeIndex([]);
      await deleteFilesFor(all);
    },
  };
};
