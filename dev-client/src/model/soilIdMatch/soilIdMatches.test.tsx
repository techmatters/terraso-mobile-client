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
  coordsKey,
  dataEntryForMatches,
  dataEntryForStatus,
  locationEntryForMatches,
  locationEntryForStatus,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

describe('coordsKey', () => {
  test('produces keys for coords', () => {
    expect(coordsKey({longitude: 1, latitude: 2})).toBe('(1, 2)');
  });
});

describe('locationEntryForStatus', () => {
  test('produces an entry with the given status and empty matches', () => {
    expect(
      locationEntryForStatus({latitude: 1, longitude: 2}, 'error'),
    ).toEqual({
      input: {latitude: 1, longitude: 2},
      status: 'error',
      matches: [],
    });
  });
});

describe('locationEntryForMatches', () => {
  test('produces an entry with ready status and the given matches', () => {
    expect(
      locationEntryForMatches({latitude: 1, longitude: 2}, ['match'] as any),
    ).toEqual({
      input: {latitude: 1, longitude: 2},
      status: 'ready',
      matches: ['match'],
    });
  });
});

describe('dataEntryForStatus', () => {
  test('produces an entry with the given status and the given matches', () => {
    expect(dataEntryForStatus('input' as any, 'error')).toEqual({
      status: 'error',
      input: 'input',
      matches: [],
    });
  });
});

describe('dataEntryForMatches', () => {
  test('produces an entry with ready status and the given matches', () => {
    expect(dataEntryForMatches('input' as any, ['match'] as any)).toEqual({
      status: 'ready',
      input: 'input',
      matches: ['match'],
    });
  });
});
