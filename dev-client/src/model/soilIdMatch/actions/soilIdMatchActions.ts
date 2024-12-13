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

import {User} from 'terraso-client-shared/account/accountSlice';
import {SoilIdInputData} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilIdService from 'terraso-client-shared/soilId/soilIdService';
import {ThunkAPI} from 'terraso-client-shared/store/utils';
import {Coords} from 'terraso-client-shared/types';

import {
  dataEntryForMatches,
  dataEntryForStatus,
  locationEntryForMatches,
  locationEntryForStatus,
  SoilIdDataEntry,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppState} from 'terraso-mobile-client/store';

export const fetchLocationBasedSoilMatchesThunk = async (
  coords: Coords,
  _: User | null,
  __: ThunkAPI,
) => fetchLocationBasedSoilMatches(coords);

export const fetchLocationBasedSoilMatches = async (coords: Coords) => {
  const result = await soilIdService.fetchLocationBasedSoilMatches(coords);

  if (result.__typename === 'SoilIdFailure') {
    return locationEntryForStatus(coords, result.reason);
  } else {
    return locationEntryForMatches(coords, result.matches);
  }
};

export const fetchSiteDataBasedSoilMatchesThunk = async (
  params: {siteId: string; input: SoilIdInputData},
  _: User | null,
  thunkApi: ThunkAPI,
) =>
  fetchSiteDataBasedSoilMatches(
    params.siteId,
    params.input,
    thunkApi.getState() as AppState,
  );

export const fetchSiteDataBasedSoilMatches = async (
  siteId: string,
  input: SoilIdInputData,
  state: AppState,
): Promise<SoilIdDataEntry> => {
  const site = state.site.sites[siteId];

  /* Nothing to fetch if the site doesn't exist */
  if (!site) {
    return dataEntryForStatus(input, 'error');
  }

  const result = await soilIdService.fetchDataBasedSoilMatches(site, input);

  if (result.__typename === 'SoilIdFailure') {
    return dataEntryForStatus(input, result.reason);
  } else {
    return dataEntryForMatches(input, result.matches);
  }
};
