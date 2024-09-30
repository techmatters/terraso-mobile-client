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

export type SyncRecords<C> = Record<string, SyncRecord<C>>;

export type SyncRecord<C> = {
  /* TODO: other forms of recordkeeping? do we want to track timestamps? */
  changes: C;
};

export type SyncState<S, C> = {
  state: S;
  changes: C;
};

export const addSyncRecord = <C>(
  records: SyncRecords<C>,
  id: string,
  changes: C,
) => (records[id] = {changes: changes});

export const clearSyncRecords = <C>(records: SyncRecords<C>, ids: string[]) => {
  for (const id of ids) {
    delete records[id];
  }
};

export const gatherSyncState = <C, S>(
  ids: string[],
  state: Record<string, S>,
  records: SyncRecords<C>,
): Record<string, SyncState<S, C>> => {
  const result: Record<string, SyncState<S, C>> = {};
  ids.forEach(id => {
    if (id in records) {
      result[id] = {
        state: state[id],
        changes: records[id].changes,
      };
    }
  });
  return result;
};
