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
  revisionIdsMatch,
} from 'terraso-mobile-client/model/sync/revisions';

describe('revisions', () => {
  describe('nextRevisionId', () => {
    test('assumes zero initial value', () => {
      expect(nextRevisionId(undefined)).toEqual(1);
    });

    test('increments by one', () => {
      expect(nextRevisionId(1)).toEqual(2);
    });
  });

  describe('revisionIdsMatch', () => {
    test('returns true for empty revision ids', () => {
      expect(revisionIdsMatch(undefined, undefined)).toBeTruthy();
    });

    test('returns true for matching revision ids', () => {
      expect(revisionIdsMatch(10, 10)).toBeTruthy();
    });

    test('returns false for non-matching revision ids', () => {
      expect(revisionIdsMatch(10, 9)).toBeFalsy();
    });

    test('returns false for empty vs. non-empty revision ids', () => {
      expect(revisionIdsMatch(10, undefined)).toBeFalsy();
    });
  });
});
