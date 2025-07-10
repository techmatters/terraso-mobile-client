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

import {SoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  coordsKey,
  flushErrorEntries,
  isErrorStatus,
  siteEntryForMatches,
  siteEntryForStatus,
  tempLocationEntryForMatches,
  tempLocationEntryForStatus,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

describe('isErrorStatus', () => {
  test('identifies errors', () => {
    expect(isErrorStatus('error')).toBeTruthy();
    expect(isErrorStatus('ALGORITHM_FAILURE')).toBeTruthy();
    expect(isErrorStatus('DATA_UNAVAILABLE')).toBeTruthy();
  });

  test('identifies non-errors', () => {
    expect(isErrorStatus('loading')).toBeFalsy();
    expect(isErrorStatus('ready')).toBeFalsy();
  });
});

describe('coordsKey', () => {
  test('produces keys for coords', () => {
    expect(coordsKey({longitude: 1, latitude: 2})).toBe('(1.00000, 2.00000)');
  });

  test('produces keys for coords with appropriate precision', () => {
    expect(coordsKey({longitude: 1.000014, latitude: 2.000014})).toBe(
      '(1.00001, 2.00001)',
    );
  });
});

describe('locationEntryForStatus', () => {
  test('produces an entry with the given status and empty matches', () => {
    expect(
      tempLocationEntryForStatus({latitude: 1, longitude: 2}, 'error'),
    ).toEqual({
      input: {latitude: 1, longitude: 2},
      status: 'error',
      matches: [],
    });
  });
});

describe('locationEntryForMatches', () => {
  test('produces an entry with ready status and the given matches', () => {
    const match = {rank: 1, score: 1};
    const inputMatches = [{locationMatch: match, dataSource: 'SSURGO'}];
    expect(
      tempLocationEntryForMatches(
        {latitude: 1, longitude: 2},
        inputMatches as SoilMatch[],
        'GLOBAL',
      ),
    ).toEqual({
      input: {latitude: 1, longitude: 2},
      status: 'ready',
      matches: [{locationMatch: match, dataSource: 'SSURGO'}],
      dataRegion: 'GLOBAL',
    });
  });
});

describe('dataEntryForStatus', () => {
  test('produces an entry with the given status and the given matches', () => {
    expect(siteEntryForStatus('input' as any, 'error')).toEqual({
      status: 'error',
      input: 'input',
      matches: [],
    });
  });
});

describe('dataEntryForMatches', () => {
  test('produces an entry with ready status and the given matches', () => {
    expect(siteEntryForMatches('input' as any, ['match'] as any, 'US')).toEqual(
      {
        status: 'ready',
        input: 'input',
        matches: ['match'],
        dataRegion: 'US',
      },
    );
  });
});

describe('flushErrorEntries', () => {
  test('removes entries with error statuses', () => {
    const coords = {latitude: 1, longitude: 2};
    const entries = {
      a: tempLocationEntryForStatus(coords, 'loading'),
      b: tempLocationEntryForStatus(coords, 'ready'),
      c: tempLocationEntryForStatus(coords, 'error'),
      d: tempLocationEntryForStatus(coords, 'ALGORITHM_FAILURE'),
      e: tempLocationEntryForStatus(coords, 'DATA_UNAVAILABLE'),
    };

    flushErrorEntries(entries);

    expect(Object.keys(entries).sort()).toEqual(['a', 'b']);
  });
});
