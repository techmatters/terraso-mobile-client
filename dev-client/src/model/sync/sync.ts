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
  RevisionId,
  revisionIdsMatch,
} from 'terraso-mobile-client/model/sync/revisions';
import {
  errorRecord,
  initialRecord,
  isError,
  isUnsynced,
  modifiedRecord,
  syncedRecord,
  SyncRecord,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/syncRecord';

export type SyncRecords<D, E> = Record<string, SyncRecord<D, E>>;

export type SyncActionResults<D, E> = {
  data: SyncResults<D>;
  errors: SyncResults<E>;
};

export type SyncResults<D> = Record<string, SyncResult<D>>;

export type SyncResult<D> = {
  data: D;
  revisionId?: RevisionId;
};

export const initializeSyncRecords = <D, E>(
  initialData: Record<string, D>,
): SyncRecords<D, E> => {
  return Object.fromEntries(
    Object.entries(initialData).map(([id, data]) => [id, initialRecord(data)]),
  );
};

export const getSyncRecords = <D, E>(
  records: SyncRecords<D, E>,
  ids: string[],
): SyncRecords<D, E> => {
  return Object.fromEntries(ids.map(id => [id, getSyncRecord(records, id)]));
};

export const getSyncRecord = <D, E>(
  records: SyncRecords<D, E>,
  id: string,
): SyncRecord<D, E> => {
  return records[id] ?? initialRecord(undefined);
};

export const markAllModified = <D>(
  records: SyncRecords<D, unknown>,
  ids: string[],
  at: SyncTimestamp,
) => {
  ids.forEach(id => markModified(records, id, at));
};

export const markModified = <D>(
  records: SyncRecords<D, unknown>,
  id: string,
  at: SyncTimestamp,
) => {
  records[id] = modifiedRecord(getSyncRecord(records, id), at);
};

export const markAllSynced = <D>(
  records: SyncRecords<D, unknown>,
  results: SyncResults<D>,
  at: SyncTimestamp,
) => {
  for (const [id, result] of Object.entries(results)) {
    markSynced(records, id, result, at);
  }
};

export const markSynced = <D>(
  records: SyncRecords<D, unknown>,
  id: string,
  result: SyncResult<D>,
  at: SyncTimestamp,
) => {
  records[id] = syncedRecord(
    getSyncRecord(records, id),
    result.data,
    result.revisionId,
    at,
  );
};

export const markErrors = <E>(
  records: SyncRecords<unknown, E>,
  errors: SyncResults<E>,
  at: SyncTimestamp,
) => {
  for (const [id, error] of Object.entries(errors)) {
    markError(records, id, error, at);
  }
};

export const markError = <E>(
  records: SyncRecords<unknown, E>,
  id: string,
  error: SyncResult<E>,
  at: SyncTimestamp,
) => {
  records[id] = errorRecord(
    getSyncRecord(records, id),
    error.data,
    error.revisionId,
    at,
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

export const applySyncActionResults = <D, E>(
  data: Record<string, D>,
  records: SyncRecords<D, E>,
  results: SyncActionResults<D, E>,
  at: SyncTimestamp,
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
  records: SyncRecords<unknown, unknown>,
  results: SyncResults<D>,
): SyncResults<D> => {
  return Object.fromEntries(
    Object.entries(results).filter(([id, result]) =>
      isResultForCurrentRevision(getSyncRecord(records, id), result),
    ),
  );
};

export const isResultForCurrentRevision = (
  record: SyncRecord<unknown, unknown>,
  result: SyncResult<unknown>,
): boolean => {
  return revisionIdsMatch(record.revisionId, result.revisionId);
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
  records: SyncRecords<D, E>,
  data: Record<string, D>,
  initialData: Record<string, D>,
): {
  newRecords: SyncRecords<D, E>;
  newData: Record<string, D>;
} => {
  const unsyncedRecords = getUnsyncedRecords(records);
  const unsyncedData = Object.fromEntries(
    Object.keys(unsyncedRecords).map(id => [id, data[id]]),
  );

  const newData = {...initialData};
  const newRecords = initializeSyncRecords<D, E>(newData);

  Object.assign(newRecords, unsyncedRecords);
  Object.assign(newData, unsyncedData);

  return {
    newRecords,
    newData,
  };
};
