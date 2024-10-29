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

export type ChangeRecords<T> = Record<string, ChangeRecord<T>>;

export type ChangeTimestamp = number;

export type ChangeRevisionId = number;

export type ChangeRecord<T> = {
  /**
   * Unique ID for the entity's current state since the last sync, monotonically increasing for each change.
   * A record is considered to be un-synced if its revision ID and last-synced revision ID do not match.
   * Allows code to determine which entities need to be synced, but also allows entites to determine whether
   * a sync result is stale (if it declares that it is for a revision ID that no longer matches the entity).
   */
  revisionId?: ChangeRevisionId;
  lastModifiedAt?: ChangeTimestamp;

  lastSyncedRevisionId?: ChangeRevisionId;
  lastSyncedData?: T;
  lastSyncedAt?: ChangeTimestamp;
};

export type SyncActionResults<T, E> = {
  data: SyncResults<T>;
  errors: SyncResults<E>;
};

export type SyncResults<T> = Record<string, SyncResult<T>>;

export type SyncResult<T> = {
  data: T;
  revisionId?: ChangeRevisionId;
};

export const INITIAL_REVISION_ID = 0;

export const nextRevisionId = (
  revisionId?: ChangeRevisionId,
): ChangeRevisionId => {
  return (revisionId ?? INITIAL_REVISION_ID) + 1;
};

export const getChanges = <T>(
  records: ChangeRecords<T>,
  ids: string[],
): ChangeRecords<T> => {
  return Object.fromEntries(ids.map(id => [id, getChange(records, id)]));
};

export const getChange = <T>(
  records: ChangeRecords<T>,
  id: string,
): ChangeRecord<T> => {
  return records[id] ?? {};
};

export const markAllChanged = <T>(
  records: ChangeRecords<T>,
  ids: string[],
  at: ChangeTimestamp,
) => {
  for (const id of ids) {
    markChanged(records, id, at);
  }
};

export const markChanged = <T>(
  records: ChangeRecords<T>,
  id: string,
  at: ChangeTimestamp,
) => {
  const prevRecord = getChange(records, id);
  const revisionId = nextRevisionId(prevRecord.revisionId);
  records[id] = {
    revisionId: revisionId,
    lastModifiedAt: at,

    lastSyncedRevisionId: prevRecord.lastSyncedRevisionId,
    lastSyncedData: prevRecord.lastSyncedData,
    lastSyncedAt: prevRecord.lastSyncedAt,
  };
};

export const markAllSynced = <T>(
  records: ChangeRecords<T>,
  results: SyncResults<T>,
  at: ChangeTimestamp,
) => {
  for (const [id, result] of Object.entries(results)) {
    markSynced(records, id, result, at);
  }
};

export const markSynced = <T>(
  records: ChangeRecords<T>,
  id: string,
  result: SyncResult<T>,
  at: ChangeTimestamp,
) => {
  const prevRecord = getChange(records, id);
  records[id] = {
    revisionId: prevRecord.revisionId,
    lastModifiedAt: prevRecord.lastModifiedAt,
    lastSyncedAt: at,
    lastSyncedRevisionId: result.revisionId,
    lastSyncedData: result.data,
  };
};

export const getSyncedRecords = <T>(
  records: ChangeRecords<T>,
): ChangeRecords<T> => {
  return Object.fromEntries(
    Object.entries(records).filter(([_, record]) => !isUnsynced(record)),
  );
};

export const getUnsyncedRecords = <T>(
  records: ChangeRecords<T>,
): ChangeRecords<T> => {
  return Object.fromEntries(
    Object.entries(records).filter(([_, record]) => isUnsynced(record)),
  );
};

export const isUnsynced = <T>(record: ChangeRecord<T>): boolean => {
  if (
    record.lastSyncedRevisionId === undefined &&
    record.revisionId === undefined
  ) {
    /* Never-synced never-changed records have no need for syncing */
    return false;
  } else if (record.lastSyncedRevisionId === undefined) {
    /* Unsynced changes if the record has changes but no last-synced id */
    return true;
  } else {
    /* Unsynced changes if the record's current revision is not the last-synced one */
    return record.revisionId !== record.lastSyncedRevisionId;
  }
};

export const applySyncActionResults = <T, E>(
  data: Record<string, T>,
  errors: Record<string, E>,
  records: ChangeRecords<T>,
  results: SyncActionResults<T, E>,
  at: ChangeTimestamp,
) => {
  /* Get results for revisions which match the current change records */
  const upToDateData = getResultsForCurrentRevisions(records, results.data);
  const upToDateErrors = getResultsForCurrentRevisions(records, results.errors);

  /* Mark the successes as synced, record their data, and clear previous errors */
  markAllSynced(records, upToDateData, at);
  applySyncResultsData(data, upToDateData);
  removeResultsKeys(errors, upToDateData);

  /* Record any new errors */
  applySyncResultsData(errors, upToDateErrors);
};

export const getResultsForCurrentRevisions = <T>(
  records: ChangeRecords<unknown>,
  results: SyncResults<T>,
): SyncResults<T> => {
  return Object.fromEntries(
    Object.entries(results).filter(([id, result]) =>
      isResultForCurrentRevision(getChange(records, id), result),
    ),
  );
};

export const isResultForCurrentRevision = <T>(
  record: ChangeRecord<T>,
  result: SyncResult<T>,
): boolean => {
  return record.revisionId === result.revisionId;
};

export const applySyncResultsData = <T>(
  data: Record<string, T>,
  results: SyncResults<T>,
) => {
  Object.assign(data, getSyncResultsData(results));
};

export const getSyncResultsData = <T>(
  results: SyncResults<T>,
): Record<string, T> => {
  return Object.fromEntries(
    Object.entries(results).map(([id, record]) => [id, record.data]),
  );
};

export const removeResultsKeys = (
  data: Record<string, unknown>,
  results: SyncResults<unknown>,
) => {
  for (const id of Object.keys(results)) {
    delete data[id];
  }
};
