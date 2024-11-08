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
  getEntityRecord,
  syncedRecord,
  SyncRecord,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/syncRecords';

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

export const applyActionResults = <D, E>(
  data: Record<string, D>,
  records: SyncRecords<D, E>,
  results: SyncActionResults<D, E>,
  at: SyncTimestamp,
) => {
  /* Get results for revisions which match the current change records */
  const upToDateData = getResultsForCurrentRevisions(records, results.data);
  const upToDateErrors = getResultsForCurrentRevisions(records, results.errors);

  /* Mark the successes as synced, record their data */
  applyResults(records, upToDateData, at);
  applyResultsData(data, upToDateData);

  /* Mark errors that occurred */
  applyErrorResults(records, upToDateErrors, at);
};

export const getResultsForCurrentRevisions = <D>(
  records: SyncRecords<unknown, unknown>,
  results: SyncResults<D>,
): SyncResults<D> => {
  return Object.fromEntries(
    Object.entries(results).filter(([id, result]) =>
      isResultForCurrentRevision(getEntityRecord(records, id), result),
    ),
  );
};

export const isResultForCurrentRevision = (
  record: SyncRecord<unknown, unknown>,
  result: SyncResult<unknown>,
): boolean => {
  return revisionIdsMatch(record.revisionId, result.revisionId);
};

export const applyResults = <D>(
  records: SyncRecords<D, unknown>,
  results: SyncResults<D>,
  at: SyncTimestamp,
) => {
  for (const [id, result] of Object.entries(results)) {
    applyResult(records, id, result, at);
  }
};

export const applyResult = <D>(
  records: SyncRecords<D, unknown>,
  id: string,
  result: SyncResult<D>,
  at: SyncTimestamp,
) => {
  records[id] = syncedRecord(
    getEntityRecord(records, id),
    result.data,
    result.revisionId,
    at,
  );
};

export const applyErrorResults = <E>(
  records: SyncRecords<unknown, E>,
  errors: SyncResults<E>,
  at: SyncTimestamp,
) => {
  for (const [id, error] of Object.entries(errors)) {
    applyErrorResult(records, id, error, at);
  }
};

export const applyErrorResult = <E>(
  records: SyncRecords<unknown, E>,
  id: string,
  error: SyncResult<E>,
  at: SyncTimestamp,
) => {
  records[id] = errorRecord(
    getEntityRecord(records, id),
    error.data,
    error.revisionId,
    at,
  );
};

export const applyResultsData = <D>(
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
