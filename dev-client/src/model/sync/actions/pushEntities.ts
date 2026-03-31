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

import type {
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import type {SyncResults} from 'terraso-mobile-client/model/sync/results';

export type EntityPushFn<D> = (
  id: string,
  record: SyncRecord<D, string>,
  data: D | undefined,
) => Promise<D>;

/**
 * Returns true if the error indicates a network/server connectivity issue
 * that should abort the entire push (so PushDispatcher can retry later).
 */
const isNetworkError = (error: unknown): boolean => {
  return (
    Array.isArray(error) &&
    (error as unknown[]).includes('terraso_api.error_request_response')
  );
};

/**
 * Pushes unsynced entities one at a time using the provided push function.
 * Network errors abort the entire push (rethrown for PushDispatcher to retry).
 * Entity-level errors are recorded and push continues to the next entity.
 */
export const pushEntities = async <D>(
  unsyncedChanges: SyncRecords<D, string>,
  data: Record<string, D | undefined>,
  pushFn: EntityPushFn<D>,
): Promise<SyncResults<D, string>> => {
  const results: SyncResults<D, string> = {data: {}, errors: {}};

  for (const [id, record] of Object.entries(unsyncedChanges)) {
    try {
      const response = await pushFn(id, record, data[id]);
      results.data[id] = {revisionId: record.revisionId, value: response};
    } catch (error) {
      if (isNetworkError(error)) {
        throw error;
      }
      console.error(`Push failed for ${id}:`, error);
      results.errors[id] = {
        revisionId: record.revisionId,
        value: String(error),
      };
    }
  }

  return results;
};
