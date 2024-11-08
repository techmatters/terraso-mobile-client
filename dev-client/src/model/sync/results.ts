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
  getEntityRecord,
  markEntityError,
  markEntitySynced,
  SyncRecord,
  SyncRecords,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/records';
import {
  RevisionId,
  revisionIdsMatch,
} from 'terraso-mobile-client/model/sync/revisions';

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

/**
 * The results of a sync operation, containing the resulting data and errors keyed by their associated entity IDs.
 */
export type SyncResults<D, E> = {
  data: SyncedValues<D>;
  errors: SyncedValues<E>;
};

export const applySyncResults = <D, E>(
  data: Record<string, D>,
  records: SyncRecords<D, E>,
  results: SyncResults<D, E>,
  at: SyncTimestamp,
) => {
  /* Get results for revisions which match the current change records */
  const upToDateData = getValuesForCurrentRevisions(records, results.data);
  const upToDateErrors = getValuesForCurrentRevisions(records, results.errors);

  /* Mark the successes as synced, record their data */
  applySyncedData(records, upToDateData, at);
  applySyncedValuesToData(data, upToDateData);

  /* Mark errors that occurred */
  applySyncedErrors(records, upToDateErrors, at);
};

export const getValuesForCurrentRevisions = <D>(
  records: SyncRecords<unknown, unknown>,
  values: SyncedValues<D>,
): SyncedValues<D> => {
  return Object.fromEntries(
    Object.entries(values).filter(([id, result]) =>
      isValueForCurrentRevision(getEntityRecord(records, id), result),
    ),
  );
};

export const isValueForCurrentRevision = (
  record: SyncRecord<unknown, unknown>,
  value: SyncedValue<unknown>,
): boolean => {
  return revisionIdsMatch(record.revisionId, value.revisionId);
};

export const applySyncedData = <D>(
  records: SyncRecords<D, unknown>,
  values: SyncedValues<D>,
  at: SyncTimestamp,
) => {
  Object.entries(values).forEach(([id, result]) =>
    applySyncedDatum(records, id, result, at),
  );
};

export const applySyncedDatum = <D>(
  records: SyncRecords<D, unknown>,
  id: string,
  value: SyncedValue<D>,
  at: SyncTimestamp,
) => {
  markEntitySynced(records, id, value.value, value.revisionId, at);
};

export const applySyncedErrors = <E>(
  records: SyncRecords<unknown, E>,
  errors: SyncedValues<E>,
  at: SyncTimestamp,
) => {
  Object.entries(errors).forEach(([id, error]) =>
    applySyncedError(records, id, error, at),
  );
};

export const applySyncedError = <E>(
  records: SyncRecords<unknown, E>,
  id: string,
  error: SyncedValue<E>,
  at: SyncTimestamp,
) => {
  markEntityError(records, id, error.value, error.revisionId, at);
};

export const applySyncedValuesToData = <D>(
  data: Record<string, D>,
  results: SyncedValues<D>,
) => {
  Object.assign(data, getValues(results));
};

export const getValues = <D>(values: SyncedValues<D>): Record<string, D> => {
  return Object.fromEntries(
    Object.entries(values).map(([id, record]) => [id, record.value]),
  );
};
