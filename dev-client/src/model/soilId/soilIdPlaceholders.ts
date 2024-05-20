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

import {SoilPropertiesDataTableRow} from 'terraso-mobile-client/components/tables/soilPropertiesData/SoilPropertiesDataTable';

/* To be replaced with actual integration w/ soilId schema */

export const SOIL_PROPERTIES_TABLE_ROWS: SoilPropertiesDataTableRow[] = [
  ['0-10', 'Clay', '7.5YR 8.5/1', '50-85%'],
  ['11-20', 'Sandy Clay Loam', '7.5YR 8.5/1', '1-15%'],
  ['100-120', '', '', ''],
];

export type LocationBasedSoilMatch = {
  dataSource: string;
  distanceToNearestMapUnitM: number;
  soilInfo: SoilInfo;
  match: SoilMatchInfo;
};

export type DataBasedSoilMatch = {
  dataSource: string;
  distanceToNearestMapUnitM: number;
  soilInfo: SoilInfo;
  locationMatch: SoilMatchInfo;
  dataMatch: SoilMatchInfo;
  combinedMatch: SoilMatchInfo;
};

export type SoilInfo = {
  soilSeries: {
    name: string;
    taxonomySubgroup: string;
    description: string;
    fullDescriptionUrl: string;
  };
  ecologicalSite?: {
    name: string;
    id: string;
    url: string;
  };
  landCapabilityClass: {
    capabilityClass: string;
    subClass: string;
  };
  soilData: any;
};

export type SoilMatchInfo = {
  score: number;
  rank: number;
};

export const SOIL_INFO: SoilInfo = {
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
  soilData: {},
};

export const SOIL_MATCH_INFO: SoilMatchInfo = {
  score: 0.98,
  rank: 1,
};

export const LOCATION_BASED_SOIL_MATCH: LocationBasedSoilMatch = {
  dataSource: 'SSURGO/STATSGO',
  distanceToNearestMapUnitM: 0,
  soilInfo: SOIL_INFO,
  match: SOIL_MATCH_INFO,
};

export const DATA_BASED_SOIL_MATCH: DataBasedSoilMatch = {
  dataSource: 'SSURGO/STATSGO',
  distanceToNearestMapUnitM: 0,
  soilInfo: SOIL_INFO,
  locationMatch: SOIL_MATCH_INFO,
  dataMatch: SOIL_MATCH_INFO,
  combinedMatch: SOIL_MATCH_INFO,
};

export const SOIL_DATA: any = {};
