/*
 * Copyright © 2025 Technology Matters
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

import {cloneDeep} from 'lodash';

import {User} from 'terraso-client-shared/account/accountSlice';
import type {
  Maybe,
  SoilMetadataUpdateMutationInput,
  UserRatingEntry,
  UserRatingInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';
import {ThunkAPI} from 'terraso-client-shared/store/utils';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {AppState} from 'terraso-mobile-client/store';

export const updateUserRatingsThunk = async (
  input: SoilMetadataUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  if (isFlagEnabled('FF_offline') && isFlagEnabled('FF_select_soil')) {
    return updateUserRatings(input, thunkApi.getState() as AppState);
  } else {
    throw Error(
      'This code path should only be available with select soil and offline flags on',
    );
  }
};

export const updateUserRatings = async (
  input: SoilMetadataUpdateMutationInput,
  state: AppState,
): Promise<SoilMetadata> => {
  const data: SoilMetadata | undefined =
    state.soilMetadata.soilMetadata[input.siteId];

  const result = initializeResult(data);
  console.log('\n-------------');
  console.log('INPUT: ', input);
  console.log('INITIALIZED: ', result);

  const updatedRatings = updateUserRatingsObject(
    input.userRatings ?? [],
    result.userRatings,
  );
  console.log('UPDATEDRATINGS: ', updatedRatings);

  result.userRatings = updatedRatings;
  console.log('RESULT: ', result);
  return result;
};

export const initializeResult = (
  data: SoilMetadata | undefined,
): SoilMetadata => {
  if (data) {
    return cloneDeep(data);
  } else {
    // No object in the state yet for this site
    return {
      userRatings: [] as Array<UserRatingEntry>,
    };
  }
};

// TOOD-cknipe: Unit test this
export const updateUserRatingsObject = (
  inputRatings: Array<Maybe<UserRatingInput>>,
  existingRatings: Array<Maybe<UserRatingEntry>>,
) => {
  // Note: the Input type and the Entry type should have the same properties
  const selectedInputSoils = inputRatings.filter(
    entry => entry?.rating === 'SELECTED',
  );
  if (selectedInputSoils.length > 1) {
    throw Error(
      `There should only be one selected soil, but found ${selectedInputSoils.length}: ${selectedInputSoils.join(',')}`,
    );
  }

  let updatedRatings: typeof existingRatings;

  // Remove any existing SELECTED rating if new soil got selected
  const hasSelectedInputSoil = selectedInputSoils.length === 1;
  updatedRatings = hasSelectedInputSoil
    ? existingRatings.filter(entry => entry?.rating !== 'SELECTED')
    : [...existingRatings];
  console.log('UPDATEDRATINGS (after removing selected): ', updatedRatings);

  // Remove soils whose ratings are getting overwritten by the input
  updatedRatings = updatedRatings.filter(
    rating =>
      !inputRatings.find(input => rating?.soilMatchId === input?.soilMatchId),
  );
  console.log('UPDATEDRATINGS (after removing dupes): ', updatedRatings);
  // inputRatings.forEach(inputRating => {
  //   const existingRating = updatedRatings.find(rating => rating?.soilMatchId === inputRating?.soilMatchId)
  // })

  // Now add them
  updatedRatings = updatedRatings.concat(inputRatings);

  return updatedRatings;
};
