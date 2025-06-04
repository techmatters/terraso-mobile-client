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
  DataBasedSoilMatch,
  SoilIdDataRegionChoices,
  SoilIdInputData,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilIdStatus} from 'terraso-client-shared/soilId/soilIdTypes';
import {Coords} from 'terraso-client-shared/types';

import {COORDINATE_PRECISION} from 'terraso-mobile-client/constants';

export type CoordsKey = `(${string}, ${string})`;

export type DataRegion = SoilIdDataRegionChoices | undefined;

export type SoilIdEntry = {
  dataRegion: DataRegion;
  input: SoilIdInputData | Coords;
  matches: SoilMatchesGeneral;
  status: SoilIdStatus;
};

export type SoilMatchesGeneral =
  | SoilMatchForTempLocation[]
  | SoilMatchForSite[];
export type SoilMatchForTempLocation = Omit<
  DataBasedSoilMatch,
  'combinedMatch' | 'dataMatch'
>;
export type SoilMatchForSite = DataBasedSoilMatch;

export const isErrorStatus = (status: SoilIdStatus): boolean => {
  return status !== 'loading' && status !== 'ready';
};

export const coordsKey = (coords: Coords): CoordsKey => {
  return `(${coords.longitude.toFixed(COORDINATE_PRECISION)}, ${coords.latitude.toFixed(COORDINATE_PRECISION)})`;
};

export const tempLocationEntryForStatus = (
  input: Coords,
  status: SoilIdStatus,
): SoilIdEntry => {
  return {
    dataRegion: undefined,
    input,
    status,
    matches: [],
  };
};

export const tempLocationEntryForMatches = (
  input: Coords,
  matches: DataBasedSoilMatch[],
  dataRegion: SoilIdDataRegionChoices,
): SoilIdEntry => {
  return {
    dataRegion: dataRegion,
    input,
    matches: matches,
    status: 'ready',
  };
};

export const siteEntryForStatus = (
  input: SoilIdInputData,
  status: SoilIdStatus,
): SoilIdEntry => {
  return {
    dataRegion: undefined,
    input,
    status: status,
    matches: [],
  };
};

// TODO-cknipe: Combo this and location?
export const siteEntryForMatches = (
  input: SoilIdInputData,
  matches: DataBasedSoilMatch[],
  dataRegion: SoilIdDataRegionChoices,
): SoilIdEntry => {
  return {
    dataRegion: dataRegion,
    input,
    status: 'ready',
    matches: matches,
  };
};

export const flushErrorEntries = (entries: Record<string, SoilIdEntry>) => {
  for (const id of Object.keys(entries)) {
    if (isErrorStatus(entries[id].status)) {
      delete entries[id];
    }
  }
};

export function getSoilMapSource(dataRegion: DataRegion): string {
  if (dataRegion === 'GLOBAL') return 'site.soil_id.soil_info.FAO_HWSD';
  else if (dataRegion === 'US') return 'site.soil_id.soil_info.USDA_NRCS';
  else return '';
}
