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
import {
  DepthDependentSoilDataUpdateMutationInput,
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataPushFailureReason,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';
import {ThunkAPI} from 'terraso-client-shared/store/utils';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import * as localSoilData from 'terraso-mobile-client/model/soilId/actions/localSoilDataActions';
import * as remoteSoilData from 'terraso-mobile-client/model/soilId/actions/remoteSoilDataActions';
import {
  getChangeRecords,
  getUnsyncedRecords,
  SyncActionResults,
} from 'terraso-mobile-client/model/sync/sync';
import {AppState} from 'terraso-mobile-client/store';

export const pushSoilDataThunk = async (
  input: string[],
  _: User | null,
  thunkApi: ThunkAPI,
) => pushSoilData(input, thunkApi.getState() as AppState);

export const pushSoilData = async (
  input: string[],
  state: AppState,
): Promise<SyncActionResults<SoilData, SoilDataPushFailureReason>> => {
  const unsyncedChanges = getUnsyncedRecords(
    getChangeRecords(state.soilId.soilChanges, input),
  );
  const unsyncedData = Object.fromEntries(
    Object.keys(unsyncedChanges).map(id => [id, state.soilId.soilData[id]]),
  );
  return remoteSoilData.pushSoilData(unsyncedChanges, unsyncedData);
};

export const updateSoilDataThunk = async (
  input: SoilDataUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => updateSoilData(input, thunkApi.getState() as AppState);

export const updateSoilData = async (
  input: SoilDataUpdateMutationInput,
  state: AppState,
): Promise<SoilData> => {
  if (isFlagEnabled('FF_offline')) {
    const data = state.soilId.soilData[input.siteId];
    return Promise.resolve(localSoilData.updateSoilData(input, data));
  } else {
    return soilDataService.updateSoilData(input);
  }
};

export const deleteSoilDataDepthIntervalThunk = async (
  input: SoilDataDeleteDepthIntervalMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => deleteSoilDataDepthInterval(input, thunkApi.getState() as AppState);

export const deleteSoilDataDepthInterval = async (
  input: SoilDataDeleteDepthIntervalMutationInput,
  state: AppState,
): Promise<SoilData> => {
  if (isFlagEnabled('FF_offline')) {
    const data = state.soilId.soilData[input.siteId];
    return Promise.resolve(
      localSoilData.deleteSoilDataDepthInterval(input, data),
    );
  } else {
    return soilDataService.deleteSoilDataDepthInterval(input);
  }
};

export const updateSoilDataDepthIntervalThunk = async (
  input: SoilDataUpdateDepthIntervalMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => updateSoilDataDepthInterval(input, thunkApi.getState() as AppState);

export const updateSoilDataDepthInterval = async (
  input: SoilDataUpdateDepthIntervalMutationInput,
  state: AppState,
): Promise<SoilData> => {
  if (isFlagEnabled('FF_offline')) {
    const data = state.soilId.soilData[input.siteId];
    return Promise.resolve(
      localSoilData.updateSoilDataDepthInterval(input, data),
    );
  } else {
    return soilDataService.updateSoilDataDepthInterval(input);
  }
};

export const updateDepthDependentSoilDataThunk = async (
  input: DepthDependentSoilDataUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => updateDepthDependentSoilData(input, thunkApi.getState() as AppState);

export const updateDepthDependentSoilData = async (
  input: DepthDependentSoilDataUpdateMutationInput,
  state: AppState,
): Promise<SoilData> => {
  if (isFlagEnabled('FF_offline')) {
    const data = state.soilId.soilData[input.siteId];
    return Promise.resolve(
      localSoilData.updateDepthDependentSoilData(input, data),
    );
  } else {
    return soilDataService.updateDepthDependentSoilData(input);
  }
};
