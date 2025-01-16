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
  LocationBasedSoilMatch,
  SoilIdInputData,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilIdStatus} from 'terraso-client-shared/soilId/soilIdTypes';
import {Coords} from 'terraso-client-shared/types';

import {COORDINATE_PRECISION} from 'terraso-mobile-client/constants';

export type CoordsKey = `(${string}, ${string})`;

export type SoilIdLocationEntry = {
  input: Coords;
  matches: LocationBasedSoilMatch[];
  status: SoilIdStatus;
};

export type SoilIdDataEntry = {
  input: SoilIdInputData;
  matches: DataBasedSoilMatch[];
  status: SoilIdStatus;
};

export type SoilIdResults = {
  locationBasedMatches: LocationBasedSoilMatch[];
  dataBasedMatches: DataBasedSoilMatch[];
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
): SoilIdLocationEntry => {
  return {
    input,
    status,
    matches: [],
  };
};

export const locationEntryForMatches = (
  input: Coords,
  matches: DataBasedSoilMatch[],
): SoilIdLocationEntry => {
  return {
    input,
    status: 'ready',
    matches: matches.map(
      ({dataMatch: _, locationMatch: __, combinedMatch, ...rest}) => ({
        ...rest,
        match: combinedMatch,
      }),
    ),
  };
};

export const dataEntryForStatus = (
  input: SoilIdInputData,
  status: SoilIdStatus,
): SoilIdDataEntry => {
  return {
    input,
    status: status,
    matches: [],
  };
};

export const dataEntryForMatches = (
  input: SoilIdInputData,
  matches: DataBasedSoilMatch[],
): SoilIdDataEntry => {
  return {
    input,
    status: 'ready',
    matches: matches,
  };
};

export const flushErrorEntries = (
  entries:
    | Record<string, SoilIdLocationEntry>
    | Record<string, SoilIdDataEntry>,
) => {
  for (const id of Object.keys(entries)) {
    if (isErrorStatus(entries[id].status)) {
      delete entries[id];
    }
  }
};
