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
  siteEntryForMatches,
  siteEntryForStatus,
  SoilIdEntry,
  tempLocationEntryForMatches,
  tempLocationEntryForStatus,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {updateTempMatchesAfterTimeout} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {AppDispatch, AppState} from 'terraso-mobile-client/store';

// TODO-cknipe: Should this live here or elsewhere?
const TIMEOUT_MS = 20000;

export const fetchTempLocationBasedSoilMatchesThunk = async (
  coords: Coords,
  _: User | null,
  {dispatch}: ThunkAPI,
) => fetchTempLocationBasedSoilMatches(coords, dispatch);

const timeoutError = {
  __typename: 'SoilIdFailure',
  reason: 'TIMEOUT' as ClientSoilIdFailureReason,
};
type TimeoutError = typeof timeoutError;

type PromiseResult =
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

  if (result.__typename === 'SoilIdFailure') {
    return tempLocationEntryForStatus(coords, result.reason);
  } else {
    if ('matches' in result && 'dataRegion' in result) {
      return tempLocationEntryForMatches(
        coords,
        result.matches,
        result.dataRegion,
      );
    } else {
      // Typescript compiler just didn't infer it, but with current types this should never happen
      // But if we ever do get here, Redux Toolkit will dispatch the rejected action for the thunk
      throw Error(
        'Unexpected error: expected non-failure SoilId result to have matches and data region',
      );
    }
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
  const result = await soilIdService.fetchSoilMatches(coords, input);

  if (result.__typename === 'SoilIdFailure') {
    return siteEntryForStatus(input, result.reason);
  } else {
    return siteEntryForMatches(input, result.matches, result.dataRegion);
  }
};
