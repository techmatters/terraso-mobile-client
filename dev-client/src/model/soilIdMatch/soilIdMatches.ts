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
  SoilMatchInfo,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilIdStatus} from 'terraso-client-shared/soilId/soilIdTypes';
import {Coords} from 'terraso-client-shared/types';

import {COORDINATE_PRECISION} from 'terraso-mobile-client/constants';

export type CoordsKey = `(${string}, ${string})`;

export type DataRegion = SoilIdDataRegionChoices | undefined;

export type SoilIdEntry = {
  dataRegion: DataRegion;
  withData: boolean | undefined; //TODO-cknipe: Do we use this, and/or do we use types?
  input: SoilIdInputData | Coords;
  matches: SoilMatchesGeneral;
  status: SoilIdStatus;
};

// DataBasedSoilMatch means "it could be either"
// SoilMatchForLocationOnly means "it definitely doesn't have the data fields"
// SoilMatchForLocationWithData means "it definitely does have the data fields"...
//    TODO-cknipe: ...wellll except that they can be null
//    So maybe name it "ForSite" if the data ones can still be null?
// The idea is the backend responds with DataBasedSoilMatch, and in the client we clarify which it is
export type SoilMatchGeneral =
  | SoilMatchForLocationOnly
  | SoilMatchForLocationWithData;
export type SoilMatchesGeneral =
  | SoilMatchForLocationOnly[]
  | SoilMatchForLocationWithData[];
export type SoilMatchForLocationOnly = Omit<
  DataBasedSoilMatch,
  'combinedMatch' | 'dataMatch'
>;
export type SoilMatchForLocationWithData = SoilMatchForLocationOnly & {
  combinedMatch: SoilMatchInfo;
  dataMatch: SoilMatchInfo;
};

// There's a hook for this, so we can get it from components
export type SoilIdResults = {
  locationBasedMatches: SoilMatchForLocationOnly[];
  dataBasedMatches: SoilMatchForLocationWithData[];
};

export const isErrorStatus = (status: SoilIdStatus): boolean => {
  return status !== 'loading' && status !== 'ready';
};

export const coordsKey = (coords: Coords): CoordsKey => {
  return `(${coords.longitude.toFixed(COORDINATE_PRECISION)}, ${coords.latitude.toFixed(COORDINATE_PRECISION)})`;
};

export const locationEntryForStatus = (
  input: Coords,
  status: SoilIdStatus,
): SoilIdEntry => {
  return {
    dataRegion: undefined,
    withData: undefined,
    input,
    status,
    matches: [],
  };
};

export const locationEntryForMatches = (
  input: Coords,
  matches: DataBasedSoilMatch[],
  dataRegion: SoilIdDataRegionChoices,
): SoilIdEntry => {
  return {
    dataRegion: dataRegion,
    withData: matches.every(match => match.combinedMatch && match.dataMatch),
    input,
    matches: matches,
    status: 'ready',
  };
};

export const dataEntryForStatus = (
  input: SoilIdInputData,
  status: SoilIdStatus,
): SoilIdEntry => {
  return {
    dataRegion: undefined,
    withData: undefined,
    input,
    status: status,
    matches: [],
  };
};

// TODO-cknipe: Combo this and location?
export const dataEntryForMatches = (
  input: SoilIdInputData,
  matches: DataBasedSoilMatch[],
  dataRegion: SoilIdDataRegionChoices,
): SoilIdEntry => {
  return {
    dataRegion: dataRegion,
    withData: matches.every(match => match.combinedMatch && match.dataMatch),
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
