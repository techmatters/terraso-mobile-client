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
  getSortedDataBasedMatches,
  getSortedLocationBasedMatches,
  getTopMatch,
} from 'terraso-mobile-client/model/soilId/soilIdRanking';

const locationBasedMatchWithRank = (rank: number) => {
  return {
    dataSource: `Data source ${rank}`,
    distanceToNearestMapUnitM: 5,
    match: {
      rank: rank,
      score: 0.5,
    },
    soilInfo: {
      landCapabilityClass: {
        capabilityClass: `Class ${rank}`,
        subClass: `Subclass ${rank}`,
      },
      soilData: {
        depthDependentData: [],
      },
      soilSeries: {
        description: `Description ${rank}`,
        fullDescriptionUrl: `Url ${rank}`,
        name: `Name ${rank}`,
        taxonomySubgroup: `Taxonomy subgroup ${rank}`,
      },
    },
  };
};

type DataRanks = {
  combinedRank: number;
  dataRank: number;
  locationRank: number;
};
const dataBasedMatchWithRanks = ({
  combinedRank,
  dataRank,
  locationRank,
}: DataRanks) => {
  return {
    dataSource: `Data source ${combinedRank}`,
    distanceToNearestMapUnitM: 5,
    combinedMatch: {
      rank: combinedRank,
      score: 0.5,
    },
    dataMatch: {
      rank: dataRank,
      score: 0.5,
    },
    locationMatch: {
      rank: locationRank,
      score: 0.5,
    },
    soilInfo: {
      landCapabilityClass: {
        capabilityClass: `Class ${combinedRank}`,
        subClass: `Subclass ${combinedRank}`,
      },
      soilData: {
        depthDependentData: [],
      },
      soilSeries: {
        description: `Description ${combinedRank}`,
        fullDescriptionUrl: `Url ${combinedRank}`,
        name: `Name ${combinedRank}`,
        taxonomySubgroup: `Taxonomy subgroup ${combinedRank}`,
      },
    },
  };
};

describe('location based matches', () => {
  const locationBasedSoil0 = locationBasedMatchWithRank(0);
  const locationBasedSoil1 = locationBasedMatchWithRank(1);
  const locationBasedSoil2 = locationBasedMatchWithRank(2);

  test('get top match by rank', () => {
    const inputSoilIdResults = {
      locationBasedMatches: [
        locationBasedSoil2,
        locationBasedSoil1,
        locationBasedSoil0,
      ],
      dataBasedMatches: [],
    };
    expect(getTopMatch(inputSoilIdResults)).toEqual(locationBasedSoil0);
  });

  test('sort by rank', () => {
    const inputSoilIdResults = {
      locationBasedMatches: [
        locationBasedSoil1,
        locationBasedSoil2,
        locationBasedSoil0,
      ],
      dataBasedMatches: [],
    };
    const sortedMatches = getSortedLocationBasedMatches(inputSoilIdResults);
    expect(sortedMatches).toEqual([
      locationBasedSoil0,
      locationBasedSoil1,
      locationBasedSoil2,
    ]);
  });
});

describe('data based matches', () => {
  const locationBasedSoil0 = locationBasedMatchWithRank(0);
  const locationBasedSoil1 = locationBasedMatchWithRank(1);
  const locationBasedSoil2 = locationBasedMatchWithRank(2);

  const dataBasedSoil0 = dataBasedMatchWithRanks({
    combinedRank: 0,
    dataRank: 1,
    locationRank: 1,
  });
  const dataBasedSoil1 = dataBasedMatchWithRanks({
    combinedRank: 1,
    dataRank: 2,
    locationRank: 2,
  });
  const dataBasedSoil2 = dataBasedMatchWithRanks({
    combinedRank: 2,
    dataRank: 0,
    locationRank: 0,
  });

  test('get top match by combined match rank', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [dataBasedSoil1, dataBasedSoil2, dataBasedSoil0],
      locationBasedMatches: [],
    };
    expect(getTopMatch(inputSoilIdResults)).toEqual(dataBasedSoil0);
  });

  test('sort by combined match rank', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [dataBasedSoil2, dataBasedSoil1, dataBasedSoil0],
      locationBasedMatches: [],
    };
    const sortedMatches = getSortedDataBasedMatches(inputSoilIdResults);
    expect(sortedMatches).toEqual([
      dataBasedSoil0,
      dataBasedSoil1,
      dataBasedSoil2,
    ]);
  });

  test('for getTopMatch take precedence over location based matches if both exist', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [dataBasedSoil0, dataBasedSoil1, dataBasedSoil2],
      locationBasedMatches: [
        locationBasedSoil0,
        locationBasedSoil1,
        locationBasedSoil2,
      ],
    };
    expect(getTopMatch(inputSoilIdResults)).toEqual(dataBasedSoil0);
  });
});

describe('empty matches', () => {
  test('get top match as undefined', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [],
      locationBasedMatches: [],
    };
    expect(getTopMatch(inputSoilIdResults)).toBeUndefined();
  });

  test('sort location based matches and return empty list', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [],
      locationBasedMatches: [],
    };
    expect(getSortedLocationBasedMatches(inputSoilIdResults)).toEqual([]);
  });

  test('sort data based matches and return empty list', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [],
      locationBasedMatches: [],
    };
    expect(getSortedDataBasedMatches(inputSoilIdResults)).toEqual([]);
  });
});
