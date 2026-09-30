/*
 * Copyright © 2026 Technology Matters
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

import {renderHook} from '@testing-library/react-native';

import {useSeenOnce} from 'terraso-mobile-client/hooks/useSeenOnce';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

jest.mock('terraso-mobile-client/persistence/kvStorage', () => ({
  kvStorage: {useNumber: jest.fn()},
}));

const mockUseNumber = kvStorage.useNumber as jest.Mock;
const setStoredRevision = jest.fn();

/* Stands in for what storage already holds; undefined means no record yet, so the hook's default applies. */
const givenStoredRevision = (stored?: number) =>
  mockUseNumber.mockImplementation((_key: string, defaultValue: number) => [
    stored ?? defaultValue,
    setStoredRevision,
  ]);

describe('useSeenOnce', () => {
  beforeEach(() => givenStoredRevision());

  it('namespaces the key so records read as a set in storage', () => {
    renderHook(() => useSeenOnce('overview.soil-id-how-it-works', 1));

    expect(mockUseNumber).toHaveBeenCalledWith(
      'seen.overview.soil-id-how-it-works',
      0,
    );
  });

  it('is unseen with no stored record', () => {
    const {result} = renderHook(() => useSeenOnce('a', 1));

    expect(result.current.seen).toBe(false);
  });

  it('is seen at the current revision', () => {
    givenStoredRevision(1);

    const {result} = renderHook(() => useSeenOnce('a', 1));

    expect(result.current.seen).toBe(true);
  });

  it('is unseen again once the revision is bumped', () => {
    givenStoredRevision(1);

    const {result} = renderHook(() => useSeenOnce('a', 2));

    expect(result.current.seen).toBe(false);
  });

  it('stays seen when a revision is rolled back', () => {
    givenStoredRevision(2);

    const {result} = renderHook(() => useSeenOnce('a', 1));

    expect(result.current.seen).toBe(true);
  });

  it('records the current revision on markSeen', () => {
    const {result} = renderHook(() => useSeenOnce('a', 3));

    result.current.markSeen();

    expect(setStoredRevision).toHaveBeenCalledWith(3);
  });
});
