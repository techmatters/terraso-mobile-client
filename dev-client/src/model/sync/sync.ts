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

export type SyncResults<T> = Record<string, SyncResult<T>>;

export type SyncResult<T> = {
  data?: T;
  revisionId?: ChangeRevisionId;
};

export const INITIAL_REVISION_ID = 0;

export const getRevisionId = <T>(
  record?: ChangeRecord<T>,
): ChangeRevisionId => {
  return record?.revisionId ?? INITIAL_REVISION_ID;
};

export const nextRevisionId = (
  revisionId: ChangeRevisionId,
): ChangeRevisionId => {
  return revisionId + 1;
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
  const prevRevisionId = getRevisionId(prevRecord);
  const revisionId = nextRevisionId(prevRevisionId);
  records[id] = {
    revisionId: revisionId,
    lastModifiedAt: at,

    lastSyncedRevisionId: prevRecord?.lastSyncedRevisionId,
    lastSyncedData: prevRecord?.lastSyncedData,
    lastSyncedAt: prevRecord?.lastSyncedAt,
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
  const prevRevisionId = getRevisionId(prevRecord);
  records[id] = {
    revisionId: prevRevisionId,
    lastModifiedAt: prevRecord?.lastModifiedAt,
    lastSyncedAt: at,
    lastSyncedRevisionId: result.revisionId,
    lastSyncedData: result.data,
  };
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
    return getRevisionId(record) !== record.lastSyncedRevisionId;
  }
};

export const getUpToDateResults = <T>(
  records: ChangeRecords<T>,
  results: SyncResults<T>,
): SyncResults<T> => {
  return Object.fromEntries(
    Object.entries(results).filter(([id, result]) =>
      isUpToDate(records[id], result),
    ),
  );
};

export const isUpToDate = <T>(
  record: ChangeRecord<T> | undefined,
  result: SyncResult<T>,
): boolean => {
  return getRevisionId(record) === result.revisionId;
};
