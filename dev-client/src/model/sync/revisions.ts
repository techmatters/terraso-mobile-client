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

/* Types and methods for manipulating monotonically-increasing revision IDs used by the sync system. */

export type ChangeRevisionId = number;

export const INITIAL_REVISION_ID = 0;

export const nextRevisionId = (
  revisionId?: ChangeRevisionId,
): ChangeRevisionId => {
  return (revisionId ?? INITIAL_REVISION_ID) + 1;
};

export const revisionIdsMatch = (
  revisionIdA?: ChangeRevisionId,
  revisionIdB?: ChangeRevisionId,
): boolean => {
  if (revisionIdA === undefined && revisionIdB === undefined) {
    /*
     * Undefinied revision IDs are considered to match (a record is still 'synced' if it has never
     * been changed or sent to the server).
     */
    return true;
  } else {
    /* Otherwise it's just integer comparison */
    return revisionIdA === revisionIdB;
  }
};
