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
  ClientSoilIdFailureReason,
  siteEntry,
  siteEntryForStatus,
  SoilIdEntry,
  tempLocationEntry,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {
  updateSiteMatchesAfterTimeout,
  updateTempMatchesAfterTimeout,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {AppDispatch, AppState} from 'terraso-mobile-client/store';

// TODO-cknipe: Should this live here or elsewhere? Also, change back to 20000
const TIMEOUT_MS = 20000;

export const fetchTempLocationBasedSoilMatchesThunk = async (
  coords: Coords,
  _: User | null,
  {dispatch}: ThunkAPI,
) => fetchTempLocationBasedSoilMatches(coords, dispatch);

const timeoutError = {
  __typename: 'SoilIdFailure' as const,
  reason: 'TIMEOUT' as ClientSoilIdFailureReason,
};
type TimeoutError = typeof timeoutError;

export type PromiseResult =
  | Awaited<ReturnType<typeof soilIdService.fetchSoilMatches>>
  | TimeoutError;

export const fetchTempLocationBasedSoilMatches = async (
  coords: Coords,
  dispatch: AppDispatch,
) => {
  const timeoutPromise = new Promise<PromiseResult>(resolve => {
    setTimeout(() => {
      resolve(timeoutError);
    }, TIMEOUT_MS);
  });
  const apiPromise = soilIdService
    .fetchSoilMatches(coords, {
      depthDependentData: [],
    })
    .then(response => {
      dispatch(updateTempMatchesAfterTimeout({coords, response}));
      return response;
    });

  const result = await Promise.race([apiPromise, timeoutPromise]);
  return tempLocationEntry(coords, result);
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
    thunkApi.dispatch,
  );

export const fetchSiteBasedSoilMatches = async (
  siteId: string,
  input: SoilIdInputData,
  state: AppState,
  dispatch: AppDispatch,
): Promise<SoilIdEntry> => {
  const site = state.site.sites[siteId];

  /* Nothing to fetch if the site doesn't exist */
  if (!site) {
    return siteEntryForStatus(input, 'error');
  }

  const timeoutPromise = new Promise<PromiseResult>(resolve => {
    setTimeout(() => {
      resolve(timeoutError);
    }, TIMEOUT_MS);
  });

  const coords = {latitude: site.latitude, longitude: site.longitude};
  const apiPromise = soilIdService
    .fetchSoilMatches(coords, input)
    .then(response => {
      dispatch(updateSiteMatchesAfterTimeout({siteId, input, response}));
      return response;
    });

  const result = await Promise.race([apiPromise, timeoutPromise]);
  return siteEntry(input, result);
};
