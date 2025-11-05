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
  UserRatingEntry,
  UserRatingInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';
import {ThunkAPI} from 'terraso-client-shared/store/utils';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {AppState} from 'terraso-mobile-client/store';

// Expects that only one userRating will be updated at a time
export type UpdateUserRatingsInput = {
  siteId: string;
  userRating: UserRatingInput;
};

export const updateUserRatingsThunk = async (
  input: UpdateUserRatingsInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  return updateUserRatings(input, thunkApi.getState() as AppState);
};

export const updateUserRatings = async (
  input: UpdateUserRatingsInput,
  state: AppState,
): Promise<SoilMetadata> => {
  if (!isFlagEnabled('FF_offline') || !isFlagEnabled('FF_select_soil')) {
    throw Error(
      'This code path should only be available with FF_select_soil and FF_offline flags on',
    );
  }
  const data: SoilMetadata | undefined =
    state.soilMetadata.soilMetadata[input.siteId];
  const result = initializeResult(data);

  const updatedRatings = updateUserRatingsObject(
    input.userRating,
    result.userRatings,
  );

  result.userRatings = updatedRatings;
  return result;
};

const initializeResult = (data: SoilMetadata | undefined): SoilMetadata => {
  if (data) {
    return cloneDeep(data);
  } else {
    // No object in the state yet for this site
    return {
      userRatings: [] as Array<UserRatingEntry>,
    };
  }
};

const updateUserRatingsObject = (
  inputRating: UserRatingEntry,
  existingRatings: Array<Maybe<UserRatingEntry>>,
) => {
  // Remove prior SELECTED rating if new soil got selected
  let updatedRatings =
    inputRating.rating === 'SELECTED'
      ? existingRatings.filter(entry => entry?.rating !== 'SELECTED')
      : [...existingRatings];

  // Remove this soil's old rating, add its new rating
  updatedRatings = updatedRatings.filter(
    entry => entry?.soilMatchId !== inputRating.soilMatchId,
  );
  updatedRatings.push(inputRating);

  return updatedRatings;
};
