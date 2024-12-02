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
  findSelectedMatch,
  getMatchSelectionId,
} from 'terraso-mobile-client/model/soilId/soilMetadataFunctions';

const dataBasedMatchWithName = (name: string) => {
  return {
    soilInfo: {
      landCapabilityClass: {capabilityClass: '', subClass: ''},
      soilData: {depthDependentData: []},
      soilSeries: {
        name: name,
        description: '',
        fullDescriptionUrl: '',
        taxonomySubgroup: '',
      },
    },
    combinedMatch: {
      rank: 0,
      score: 0,
    },
    dataMatch: {
      rank: 0,
      score: 0,
    },
    distanceToNearestMapUnitM: 0,
    locationMatch: {
      rank: 0,
      score: 0,
    },
    dataSource: '',
  };
};

describe('getMatchSelectionId', () => {
  test('returns the soil series name', () => {
    expect(getMatchSelectionId(dataBasedMatchWithName('hello'))).toEqual(
      'hello',
    );
  });
});

describe('findSelectedMatch', () => {
  test('returns the match with the matching name', () => {
    const a = dataBasedMatchWithName('a');
    const b = dataBasedMatchWithName('b');
    const c = dataBasedMatchWithName('c');

    expect(findSelectedMatch([a, b, c], 'b')).toBe(b);
  });

  test('returns undefined for no match', () => {
    const a = dataBasedMatchWithName('a');
    const b = dataBasedMatchWithName('b');
    const c = dataBasedMatchWithName('c');

    expect(findSelectedMatch([a, b, c], 'z')).toBeUndefined();
  });

  test('returns undefined for no selection', () => {
    const a = dataBasedMatchWithName('a');
    const b = dataBasedMatchWithName('b');
    const c = dataBasedMatchWithName('c');

    expect(findSelectedMatch([a, b, c], undefined)).toBeUndefined();
  });
});
