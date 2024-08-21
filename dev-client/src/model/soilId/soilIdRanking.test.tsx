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

const locationBasedSoil0 = {
  dataSource: 'Data source 0',
  distanceToNearestMapUnitM: 5,
  match: {
    rank: 0,
    score: 0.5,
  },
  soilInfo: {
    landCapabilityClass: {
      capabilityClass: 'Class 0',
      subClass: 'Subclass 0',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description 0',
      fullDescriptionUrl: 'Url 0',
      name: 'Name 0',
      taxonomySubgroup: 'Taxonomy subgroup 0',
    },
  },
};
const locationBasedSoil1 = {
  dataSource: 'Data source 1',
  distanceToNearestMapUnitM: 5,
  match: {
    rank: 1,
    score: 0.5,
  },
  soilInfo: {
    landCapabilityClass: {
      capabilityClass: 'Class 1',
      subClass: 'Subclass 1',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description 1',
      fullDescriptionUrl: 'Url 1',
      name: 'Name 1',
      taxonomySubgroup: 'Taxonomy subgroup 1',
    },
  },
};
const locationBasedSoil2 = {
  dataSource: 'Data source 2',
  distanceToNearestMapUnitM: 5,
  match: {
    rank: 2,
    score: 0.5,
  },
  soilInfo: {
    landCapabilityClass: {
      capabilityClass: 'Class 2',
      subClass: 'Subclass 2',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description 2',
      fullDescriptionUrl: 'Url 2',
      name: 'Name 2',
      taxonomySubgroup: 'Taxonomy subgroup 2',
    },
  },
};

const dataBasedSoil0 = {
  dataSource: 'Data source 0',
  distanceToNearestMapUnitM: 5,
  combinedMatch: {
    rank: 0,
    score: 0.5,
  },
  dataMatch: {
    rank: 1,
    score: 0.5,
  },
  locationMatch: {
    rank: 1,
    score: 0.5,
  },
  soilInfo: {
    landCapabilityClass: {
      capabilityClass: 'Class 0',
      subClass: 'Subclass 0',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description 0',
      fullDescriptionUrl: 'Url 0',
      name: 'Name 0',
      taxonomySubgroup: 'Taxonomy subgroup 0',
    },
  },
};
const dataBasedSoil1 = {
  dataSource: 'Data source 1',
  distanceToNearestMapUnitM: 5,
  combinedMatch: {
    rank: 1,
    score: 0.5,
  },
  dataMatch: {
    rank: 2,
    score: 0.5,
  },
  locationMatch: {
    rank: 2,
    score: 0.5,
  },
  soilInfo: {
    landCapabilityClass: {
      capabilityClass: 'Class 1',
      subClass: 'Subclass 1',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description 1',
      fullDescriptionUrl: 'Url 1',
      name: 'Name 1',
      taxonomySubgroup: 'Taxonomy subgroup 1',
    },
  },
};
const dataBasedSoil2 = {
  dataSource: 'Data source 2',
  distanceToNearestMapUnitM: 5,
  combinedMatch: {
    rank: 2,
    score: 0.5,
  },
  dataMatch: {
    rank: 0,
    score: 0.5,
  },
  locationMatch: {
    rank: 0,
    score: 0.5,
  },
  soilInfo: {
    landCapabilityClass: {
      capabilityClass: 'Class 2',
      subClass: 'Subclass 2',
    },
    soilData: {
      depthDependentData: [],
    },
    soilSeries: {
      description: 'Description 2',
      fullDescriptionUrl: 'Url 2',
      name: 'Name 2',
      taxonomySubgroup: 'Taxonomy subgroup 2',
    },
  },
};

describe('location based matches', () => {
  test('get top match by rank', () => {
    const inputSoilIdResults = {
      locationBasedMatches: [
        locationBasedSoil0,
        locationBasedSoil1,
        locationBasedSoil2,
      ],
      dataBasedMatches: [],
    };
    expect(getTopMatch(inputSoilIdResults)).toEqual(locationBasedSoil0);
  });

  test('get top match by rank when reordered', () => {
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
  test('get top match by combined match rank', () => {
    const inputSoilIdResults = {
      dataBasedMatches: [dataBasedSoil0, dataBasedSoil1, dataBasedSoil2],
      locationBasedMatches: [],
    };
    expect(getTopMatch(inputSoilIdResults)).toEqual(dataBasedSoil0);
  });

  test('get top match by combined match rank when reordered', () => {
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
