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

/** The timestamp format used by the sync system (just Date.now()). */
export type SyncTimestamp = number;

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

/**
 * A collection of sync records keyed by their associated entity IDs.
 */
export type SyncRecords<D, E> = Record<string, SyncRecord<D, E>>;

/**
 * A value that is the result of syncing some data at a specified revision ID.
 */
export type SyncedValue<T> = {
  value: T;
  revisionId?: RevisionId;
};

/**
 * A collection of synced values keyed by their associated entity IDs.
 */
export type SyncedValues<T> = Record<string, SyncedValue<T>>;

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
  data: SyncedValue<D>,
  at: SyncTimestamp,
): SyncRecord<D, E> => {
  return {
    ...prevRecord,

    lastSyncedRevisionId: data.revisionId,
    lastSyncedData: data.value,
    lastSyncedError: undefined,
    lastSyncedAt: at,
  };
};

export const errorRecord = <D, E>(
  precRecord: SyncRecord<D, E>,
  error: SyncedValue<E>,
  at: SyncTimestamp,
) => {
  return {
    ...precRecord,

    lastSyncedRevisionId: error.revisionId,
    lastSyncedError: error.value,
    lastSyncedAt: at,
  };
};

export const isUnsynced = (record: SyncRecord<unknown, unknown>): boolean => {
  return !revisionIdsMatch(record.revisionId, record.lastSyncedRevisionId);
};

export const isError = (record: SyncRecord<unknown, unknown>): boolean => {
  return record.lastSyncedError !== undefined;
};

export const initializeEntityRecords = <D, E>(
  data: Record<string, D>,
): SyncRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(data).map(([id, entityData]) => [
      id,
      initialRecord(entityData),
    ]),
  );
};

export const mergeUnsyncedEntities = <D, E>(
  records: SyncRecords<D, E>,
  data: Record<string, D>,
  newData: Record<string, D>,
): {
  mergedRecords: SyncRecords<D, E>;
  mergedData: Record<string, D>;
} => {
  const unsyncedRecords = getUnsyncedRecords(records);
  const unsyncedData = getDataForRecords(unsyncedRecords, data);

  const mergedData = {...newData};
  const mergedRecords = initializeEntityRecords<D, E>(newData);

  Object.assign(mergedRecords, unsyncedRecords);
  Object.assign(mergedData, unsyncedData);

  return {
    mergedRecords,
    mergedData,
  };
};

export const getEntityRecords = <D, E>(
  records: SyncRecords<D, E>,
  ids: string[],
): SyncRecords<D, E> => {
  return Object.fromEntries(ids.map(id => [id, getEntityRecord(records, id)]));
};

export const getEntityRecord = <D, E>(
  records: SyncRecords<D, E>,
  id: string,
): SyncRecord<D, E> => {
  return records[id] ?? initialRecord(undefined);
};

export const getDataForRecords = <D, E>(
  records: SyncRecords<D, E>,
  data: Record<string, D>,
): Record<string, D> => {
  return Object.fromEntries(
    Object.keys(records)
      .filter(key => key in data)
      .map(id => [id, data[id]!]),
  );
};

export const getUnsyncedRecords = <D, E>(
  records: SyncRecords<D, E>,
): SyncRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(records).filter(([_, record]) => isUnsynced(record)),
  );
};

export const getErrorRecords = <D, E>(
  records: SyncRecords<D, E>,
): SyncRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(records).filter(([_, record]) => isError(record)),
  );
};

export const markEntitiesModified = <D>(
  records: SyncRecords<D, unknown>,
  ids: string[],
  at: SyncTimestamp,
) => {
  ids.forEach(id => markEntityModified(records, id, at));
};

export const markEntityModified = <D>(
  records: SyncRecords<D, unknown>,
  id: string,
  at: SyncTimestamp,
) => {
  records[id] = modifiedRecord(getEntityRecord(records, id), at);
};

export const markEntitesSynced = <D>(
  records: SyncRecords<D, unknown>,
  data: SyncedValues<D>,
  at: SyncTimestamp,
) => {
  Object.entries(data).forEach(([id, value]) =>
    markEntitySynced(records, id, value, at),
  );
};

export const markEntitySynced = <D>(
  records: SyncRecords<D, unknown>,
  id: string,
  data: SyncedValue<D>,
  at: SyncTimestamp,
) => {
  records[id] = syncedRecord(getEntityRecord(records, id), data, at);
};

export const markEntitiesError = <E>(
  records: SyncRecords<unknown, E>,
  errors: SyncedValues<E>,
  at: SyncTimestamp,
) => {
  Object.entries(errors).forEach(([id, error]) =>
    markEntityError(records, id, error, at),
  );
};

export const markEntityError = <E>(
  records: SyncRecords<unknown, E>,
  id: string,
  error: SyncedValue<E>,
  at: SyncTimestamp,
) => {
  records[id] = errorRecord(getEntityRecord(records, id), error, at);
};
