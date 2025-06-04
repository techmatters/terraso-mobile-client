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
  siteEntryForMatches,
  siteEntryForStatus,
  SoilIdEntry,
  tempLocationEntryForMatches,
  tempLocationEntryForStatus,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppState} from 'terraso-mobile-client/store';

export const fetchTempLocationBasedSoilMatchesThunk = async (
  coords: Coords,
  _: User | null,
  __: ThunkAPI,
) => fetchTempLocationBasedSoilMatches(coords);

export const fetchTempLocationBasedSoilMatches = async (coords: Coords) => {
  // NOTE: we call the dataBasedSoilMatches endpoint here to make the
  //       pre and post site creation soil lists consistent.
  //       Upstream bug: https://github.com/techmatters/soil-id-algorithm/issues/126
  const result = await soilIdService.fetchDataBasedSoilMatches(coords, {
    depthDependentData: [],
  });

  console.log('LOCATION ONLY: ', result);
  if (result.__typename === 'SoilIdFailure') {
    return tempLocationEntryForStatus(coords, result.reason);
  } else {
    return tempLocationEntryForMatches(
      coords,
      result.matches,
      result.dataRegion,
    );
  }
};

export const fetchSiteBasedSoilMatchesThunk = async (
  params: {siteId: string; input: SoilIdInputData},
  _: User | null,
  thunkApi: ThunkAPI,
) =>
  fetchSiteBasedSoilMatches(
    params.siteId,
    params.input,
    thunkApi.getState() as AppState,
  );

export const fetchSiteBasedSoilMatches = async (
  siteId: string,
  input: SoilIdInputData,
  state: AppState,
): Promise<SoilIdEntry> => {
  const site = state.site.sites[siteId];

  /* Nothing to fetch if the site doesn't exist */
  if (!site) {
    return siteEntryForStatus(input, 'error');
  }

  const coords = {latitude: site.latitude, longitude: site.longitude};
  const result = await soilIdService.fetchDataBasedSoilMatches(coords, input);
  console.log('SITE DATA BASED: ', result);

  if (result.__typename === 'SoilIdFailure') {
    return siteEntryForStatus(input, result.reason);
  } else {
    return siteEntryForMatches(input, result.matches, result.dataRegion);
  }
};
