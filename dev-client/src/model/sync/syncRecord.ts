/*
 * Copyright © 2024 Technology Matters
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

import {
  nextRevisionId,
  RevisionId,
  revisionIdsMatch,
} from 'terraso-mobile-client/model/sync/revisions';

/**
 * A record of the sync state of some piece of data.
 *
 * Sync records track the modification history of the data via an incrementing revision ID and modification timestamp.
 * They can be marked as "synced", which records the last-synced data state and revision ID. They can also be marked
 * with "errors", which also records the revision ID that caused the error but retaining the last-synced data from the
 * last successful sync.
 *
 * Records are initialized with some piece of data (possibly no data) and have no modification or sync metadata until
 * added by other methods.
 *
 * It is intended that individual sync records are immutable for their lifetime; their associated methods are all pure
 * functions which return new objects containing updated state for the various operations they perform.
 */
export type SyncRecord<D, E> = {
  /**
   * Unique ID for the entity's current state since the last sync, monotonically increasing for each change.
   * A record is considered to be un-synced if its revision ID and last-synced revision ID do not match.
   * Allows code to determine which entities need to be synced, but also allows entites to determine whether
   * a sync result is stale (if it declares that it is for a revision ID that no longer matches the entity).
   */
  revisionId?: RevisionId;
  lastModifiedAt?: SyncTimestamp;

  lastSyncedRevisionId?: RevisionId;
  lastSyncedAt?: SyncTimestamp;
  /**
   * The last successfully-synced data for this record.
   */
  lastSyncedData?: D;
  /**
   * The last sync error for this record (cleared on sync success).
   */
  lastSyncedError?: E;
};

export type SyncTimestamp = number;

export const initialRecord = <D, E>(
  initialData: D | undefined,
): SyncRecord<D, E> => {
  return {lastSyncedData: initialData};
};

export const modifiedRecord = <D, E>(
  prevRecord: SyncRecord<D, E>,
  at: SyncTimestamp,
): SyncRecord<D, E> => {
  const revisionId = nextRevisionId(prevRecord.revisionId);
  return {
    ...prevRecord,

    revisionId: revisionId,
    lastModifiedAt: at,
  };
};

export const syncedRecord = <D, E>(
  prevRecord: SyncRecord<D, E>,
  data: D,
  revisionId: RevisionId | undefined,
  at: SyncTimestamp,
): SyncRecord<D, E> => {
  return {
    ...prevRecord,

    lastSyncedRevisionId: revisionId,
    lastSyncedData: data,
    lastSyncedError: undefined,
    lastSyncedAt: at,
  };
};

export const errorRecord = <D, E>(
  precRecord: SyncRecord<D, E>,
  error: E,
  revisionId: RevisionId | undefined,
  at: SyncTimestamp,
) => {
  return {
    ...precRecord,

    lastSyncedRevisionId: revisionId,
    lastSyncedError: error,
    lastSyncedAt: at,
  };
};

export const isUnsynced = (record: SyncRecord<unknown, unknown>): boolean => {
  return !revisionIdsMatch(record.revisionId, record.lastSyncedRevisionId);
};

export const isError = (record: SyncRecord<unknown, unknown>): boolean => {
  return record.lastSyncedError !== undefined;
};
