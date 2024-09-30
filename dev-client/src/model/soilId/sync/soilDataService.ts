import {User} from 'terraso-client-shared/account/accountSlice';
import {
  DepthDependentSoilDataUpdateMutationInput,
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {ThunkAPI} from 'terraso-client-shared/store/utils';

import {
  deleteSoilDataDepthInterval,
  updateDepthDependentSoilData,
  updateSoilData,
  updateSoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilId/sync/localSoilDataMutations';
import {sync} from 'terraso-mobile-client/model/soilId/sync/remoteSoilDataSync';
import {gatherSyncState} from 'terraso-mobile-client/model/sync/syncRecords';
import {AppState} from 'terraso-mobile-client/store';

export const updateSoilDataThunk = async (
  input: SoilDataUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  const state = thunkApi.getState() as AppState;
  const soilData = state.soilId.soilData[input.siteId];
  if (!soilData) {
    throw new Error('Updating site that no longer exists in store');
  }
  return updateSoilData(input, soilData);
};

export const updateSoilDataDepthIntervalThunk = async (
  input: SoilDataUpdateDepthIntervalMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  const state = thunkApi.getState() as AppState;
  const soilData = state.soilId.soilData[input.siteId];
  if (!soilData) {
    throw new Error('Updating site that no longer exists in store');
  }
  return updateSoilDataDepthInterval(input, soilData);
};

export const deleteSoilDataDepthIntervalThunk = async (
  input: SoilDataDeleteDepthIntervalMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  const state = thunkApi.getState() as AppState;
  const soilData = state.soilId.soilData[input.siteId];
  if (!soilData) {
    throw new Error('Updating site that no longer exists in store');
  }
  return deleteSoilDataDepthInterval(input, soilData!);
};

export const updateDepthDependentSoilDataThunk = async (
  input: DepthDependentSoilDataUpdateMutationInput,
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  const state = thunkApi.getState() as AppState;
  const soilData = state.soilId.soilData[input.siteId];
  if (!soilData) {
    throw new Error('Updating site that no longer exists in store');
  }
  return updateDepthDependentSoilData(input, soilData!);
};

export const syncSoilDataThunk = async (
  siteIds: string[],
  _: User | null,
  thunkApi: ThunkAPI,
) => {
  const state = thunkApi.getState() as AppState;
  const syncRecords = state.soilId.soilDataSync;
  const soilData = state.soilId.soilData;
  const syncState = gatherSyncState(siteIds, soilData, syncRecords);
  return await sync(syncState);
};
