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

export type ChangeRecords<D, E> = Record<string, ChangeRecord<D, E>>;

export type ChangeTimestamp = number;

export type ChangeRevisionId = number;

export type ChangeRecord<D, E> = {
  /**
   * Unique ID for the entity's current state since the last sync, monotonically increasing for each change.
   * A record is considered to be un-synced if its revision ID and last-synced revision ID do not match.
   * Allows code to determine which entities need to be synced, but also allows entites to determine whether
   * a sync result is stale (if it declares that it is for a revision ID that no longer matches the entity).
   */
  revisionId?: ChangeRevisionId;
  lastModifiedAt?: ChangeTimestamp;

  lastSyncedRevisionId?: ChangeRevisionId;

  /**
   * The last successfully-synced data for this record.
   */
  lastSyncedData?: D;
  /**
   * The last sync error for this record (cleared on sync success).
   */
  lastSyncedError?: E;

  lastSyncedAt?: ChangeTimestamp;
};

export type SyncActionResults<D, E> = {
  data: SyncResults<D>;
  errors: SyncResults<E>;
};

export type SyncResults<D> = Record<string, SyncResult<D>>;

export type SyncResult<D> = {
  data: D;
  revisionId?: ChangeRevisionId;
};

export const INITIAL_REVISION_ID = 0;

export const nextRevisionId = (
  revisionId?: ChangeRevisionId,
): ChangeRevisionId => {
  return (revisionId ?? INITIAL_REVISION_ID) + 1;
};

export const getChangeRecords = <D, E>(
  records: ChangeRecords<D, E>,
  ids: string[],
): ChangeRecords<D, E> => {
  return Object.fromEntries(ids.map(id => [id, getChangeRecord(records, id)]));
};

export const getChangeRecord = <D, E>(
  records: ChangeRecords<D, E>,
  id: string,
): ChangeRecord<D, E> => {
  return records[id] ?? {};
};

export const markAllChanged = <D>(
  records: ChangeRecords<D, unknown>,
  ids: string[],
  at: ChangeTimestamp,
) => {
  for (const id of ids) {
    markChanged(records, id, at);
  }
};

export const markChanged = <D>(
  records: ChangeRecords<D, unknown>,
  id: string,
  at: ChangeTimestamp,
) => {
  const prevRecord = getChangeRecord(records, id);
  const revisionId = nextRevisionId(prevRecord.revisionId);
  records[id] = {
    ...prevRecord,
    revisionId: revisionId,
    lastModifiedAt: at,
  };
};

export const markAllSynced = <D>(
  records: ChangeRecords<D, unknown>,
  results: SyncResults<D>,
  at: ChangeTimestamp,
) => {
  for (const [id, result] of Object.entries(results)) {
    markSynced(records, id, result, at);
  }
};

export const markSynced = <D>(
  records: ChangeRecords<D, unknown>,
  id: string,
  result: SyncResult<D>,
  at: ChangeTimestamp,
) => {
  const prevRecord = getChangeRecord(records, id);
  records[id] = {
    ...prevRecord,
    lastSyncedRevisionId: result.revisionId,
    lastSyncedData: result.data,
    lastSyncedError: undefined,
    lastSyncedAt: at,
  };
};

export const markErrors = <E>(
  records: ChangeRecords<unknown, E>,
  errors: SyncResults<E>,
  at: ChangeTimestamp,
) => {
  for (const [id, error] of Object.entries(errors)) {
    markError(records, id, error, at);
  }
};

export const markError = <E>(
  records: ChangeRecords<unknown, E>,
  id: string,
  error: SyncResult<E>,
  at: ChangeTimestamp,
) => {
  const prevRecord = getChangeRecord(records, id);
  records[id] = {
    ...prevRecord,

    lastSyncedRevisionId: error.revisionId,
    lastSyncedError: error.data,
    lastSyncedAt: at,
  };
};

export const getUnsyncedRecords = <D, E>(
  records: ChangeRecords<D, E>,
): ChangeRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(records).filter(([_, record]) => isUnsynced(record)),
  );
};

export const isUnsynced = (record: ChangeRecord<unknown, unknown>): boolean => {
  if (
    record.lastSyncedRevisionId === undefined &&
    record.revisionId === undefined
  ) {
    /* Never-synced never-changed records have no need for syncing */
    return false;
  } else {
    /* Unsynced if the record's current revision is not the last-synced one */
    return record.revisionId !== record.lastSyncedRevisionId;
  }
};

export const getErrorRecords = <D, E>(
  records: ChangeRecords<D, E>,
): ChangeRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(records).filter(([_, record]) => isError(record)),
  );
};

export const isError = (record: ChangeRecord<unknown, unknown>): boolean => {
  return record.lastSyncedError !== undefined;
};

export const applySyncActionResults = <D, E>(
  data: Record<string, D>,
  records: ChangeRecords<D, E>,
  results: SyncActionResults<D, E>,
  at: ChangeTimestamp,
) => {
  /* Get results for revisions which match the current change records */
  const upToDateData = getResultsForCurrentRevisions(records, results.data);
  const upToDateErrors = getResultsForCurrentRevisions(records, results.errors);

  /* Mark the successes as synced, record their data */
  markAllSynced(records, upToDateData, at);
  applySyncResultsData(data, upToDateData);

  /* Mark errors that occurred */
  markErrors(records, upToDateErrors, at);
};

export const getResultsForCurrentRevisions = <D>(
  records: ChangeRecords<unknown, unknown>,
  results: SyncResults<D>,
): SyncResults<D> => {
  return Object.fromEntries(
    Object.entries(results).filter(([id, result]) =>
      isResultForCurrentRevision(getChangeRecord(records, id), result),
    ),
  );
};

export const isResultForCurrentRevision = (
  record: ChangeRecord<unknown, unknown>,
  result: SyncResult<unknown>,
): boolean => {
  return record.revisionId === result.revisionId;
};

export const applySyncResultsData = <D>(
  data: Record<string, D>,
  results: SyncResults<D>,
) => {
  Object.assign(data, getSyncResultsData(results));
};

export const getSyncResultsData = <D>(
  results: SyncResults<D>,
): Record<string, D> => {
  return Object.fromEntries(
    Object.entries(results).map(([id, record]) => [id, record.data]),
  );
};

export const mergeUnsyncedRecordsWithData = <D, E>(
  records: ChangeRecords<D, E>,
  data: Record<string, D>,
  initialData: Record<string, D>,
): {
  newRecords: ChangeRecords<D, E>;
  newData: Record<string, D>;
} => {
  const unsyncedRecords = getUnsyncedRecords(records);
  const unsyncedData = Object.fromEntries(
    Object.keys(unsyncedRecords).map(id => [id, data[id]]),
  );

  const newData = {...initialData};
  const newRecords = initializeChangeRecords<D, E>(newData);

  Object.assign(newRecords, unsyncedRecords);
  Object.assign(newData, unsyncedData);

  return {
    newRecords,
    newData,
  };
};

export const initializeChangeRecords = <D, E>(
  initialData: Record<string, D>,
): ChangeRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(initialData).map(([id, data]) => [
      id,
      {lastSyncedData: data},
    ]),
  );
};
