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

export const SOIL_DATA: any = {
  depthDependentData: [
    {
      depthInterval: {start: 0, end: 10},
      texture: 'CLAY',
      colorChroma: 0.5,
      colorHue: 0.5,
      colorValue: 0.5,
      rockFragment: 'VOLUME_60',
    },
    {
      depthInterval: {start: 11, end: 20},
      texture: 'SANDY_CLAY_LOAM',
      colorChroma: 0.4,
      colorHue: 0.4,
      colorValue: 0.4,
      rockFragment: 'VOLUME_1_15',
    },
    {
      depthInterval: {start: 100, end: 120},
      texture: undefined,
      colorChroma: undefined,
      colorHue: undefined,
      colorValue: undefined,
      rockFragment: undefined,
    },
  ],
};

export const SOIL_ID_DATA = {
  depthDependentData: [
    {
      depthInterval: {start: 0, end: 10},
      texture: 'CLAY',
      munsellColorString: '7.5YR 8.5/1',
      rockFragment: 'VOLUME_60',
    },
    {
      depthInterval: {start: 11, end: 20},
      texture: 'SANDY_CLAY_LOAM',
      munsellColorString: '7.5YR 8.5/1',
      rockFragment: 'VOLUME_1_15',
    },
    {
      depthInterval: {start: 100, end: 120},
      texture: undefined,
      munsellColorString: undefined,
      rockFragment: undefined,
    },
  ],
};

export const SOIL_INFO = {
  soilSeries: {
    name: 'Yemassee',
    taxonomySubgroup: 'Aeric Endoaquults',
    description:
      'The Yemassee series consists of very deep, somewhat poorly drained, moderately permeable, loamy soils that formed in marine sediments. These soils are on terraces and broad flats of the lower Coastal Plain. Slopes range from 0 to 2 percent.',
    fullDescriptionUrl: 'https://www.example.com',
  },
  ecologicalSite: {
    name: 'Loamy Fine Sand',
    id: 'F153AY040NC',
    url: 'https://www.example.com',
  },
  landCapabilityClass: {
    capabilityClass: '8 - w',
    subClass: '',
  },
  soilData: SOIL_ID_DATA,
};

export const SOIL_MATCH_INFO = {
  score: 0.98,
  rank: 1,
};

export const LOCATION_BASED_SOIL_MATCH = {
  dataSource: 'SSURGO/STATSGO',
  distanceToNearestMapUnitM: 0,
  soilInfo: SOIL_INFO,
  match: SOIL_MATCH_INFO,
};

export const DATA_BASED_SOIL_MATCH = {
  dataSource: 'SSURGO/STATSGO',
  distanceToNearestMapUnitM: 0,
  soilInfo: SOIL_INFO,
  locationMatch: SOIL_MATCH_INFO,
  dataMatch: SOIL_MATCH_INFO,
  combinedMatch: SOIL_MATCH_INFO,
};
