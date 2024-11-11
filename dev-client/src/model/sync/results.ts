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
  markEntitiesError,
  markEntitesSynced as markEntitiesSynced,
  SyncedValue,
  SyncedValues,
  SyncRecord,
  SyncRecords,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/records';
import {revisionIdsMatch} from 'terraso-mobile-client/model/sync/revisions';

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
  markEntitiesSynced(records, upToDateData, at);
  applySyncedValuesToData(data, upToDateData);

  /* Mark errors that occurred */
  markEntitiesError(records, upToDateErrors, at);
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

export const applySyncedValuesToData = <D>(
  data: Record<string, D>,
  values: SyncedValues<D>,
) => {
  Object.entries(values).forEach(([id, value]) => (data[id] = value.value));
};
