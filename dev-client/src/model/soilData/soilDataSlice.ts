/*
 * Copyright © 2023 Technology Matters
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

import {createSlice, Draft, PayloadAction} from '@reduxjs/toolkit';

import {SoilDataPushFailureReason} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import {
  CollectionMethod,
  DisabledCollectionMethod,
  LoadingState,
  ProjectSoilSettings,
  SoilData,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import * as soilDataActions from 'terraso-mobile-client/model/soilData/actions/soilDataActions';
import {
  markEntityModified,
  mergeUnsyncedEntities,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {applySyncResults} from 'terraso-mobile-client/model/sync/results';

export * from 'terraso-client-shared/soilId/soilIdTypes';
export * from 'terraso-mobile-client/model/soilData/soilDataFunctions';

export type MethodRequired<
  T extends CollectionMethod | DisabledCollectionMethod,
> = `${T}Required`;

export type SoilState = {
  /* Note that the keys for these records are the site IDs to which the soil data belongs */
  soilData: Record<string, SoilData | undefined>;
  soilSync: SyncRecords<SoilData, SoilDataPushFailureReason>;

  projectSettings: Record<string, ProjectSoilSettings | undefined>;
  status: LoadingState;
};

export const initialState: SoilState = {
  soilData: {},
  soilSync: {},

  projectSettings: {},
  status: 'loading',
};

export const setProjectSettings = (
  state: Draft<SoilState>,
  settings: Record<string, ProjectSoilSettings>,
) => {
  state.projectSettings = settings;
};

export const updateProjectSettings = (
  state: Draft<SoilState>,
  settings: Record<string, ProjectSoilSettings>,
) => {
  Object.assign(state.projectSettings, settings);
};

export const updateSoilIdStatus = (
  state: Draft<SoilState>,
  status: LoadingState,
) => {
  state.status = status;
};

export const setSoilData = (
  state: Draft<SoilState>,
  soilData: Record<string, SoilData>,
) => {
  const {mergedRecords, mergedData} = mergeUnsyncedEntities(
    state.soilSync,
    state.soilData as Record<string, SoilData>,
    soilData,
  );
  state.soilData = mergedData;
  state.soilSync = mergedRecords;
};

export const deleteSoilData = (state: Draft<SoilState>, siteIds: string[]) => {
  for (const siteId of siteIds) {
    delete state.soilData[siteId];
  }
};

const soilDataSlice = createSlice({
  name: 'soilData',
  initialState,
  reducers: {
    setSoilIdStatus: (state, action: PayloadAction<LoadingState>) => {
      state.status = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(pushSoilData.fulfilled, (state, action) => {
      applySyncResults(
        /*
         * type-cast here bc the soilData field is more permissive than the results object
         * (it allows undefined values). this is safe since we aren't reading anything from
         * the prior data.
         */
        state.soilData as Record<string, SoilData>,
        state.soilSync,
        action.payload,
        Date.now(),
      );
    });

    builder.addCase(updateSoilData.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markEntityModified(state.soilSync, action.meta.arg.siteId, Date.now());
    });

    builder.addCase(updateDepthDependentSoilData.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markEntityModified(state.soilSync, action.meta.arg.siteId, Date.now());
    });

    builder.addCase(updateSoilDataDepthInterval.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markEntityModified(state.soilSync, action.meta.arg.siteId, Date.now());
    });

    builder.addCase(deleteSoilDataDepthInterval.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markEntityModified(state.soilSync, action.meta.arg.siteId, Date.now());
    });

    builder.addCase(updateProjectSoilSettings.fulfilled, (state, action) => {
      state.projectSettings[action.meta.arg.projectId] = action.payload;
    });

    builder.addCase(updateProjectDepthInterval.fulfilled, (state, action) => {
      state.projectSettings[action.meta.arg.projectId] = action.payload;
    });

    builder.addCase(deleteProjectDepthInterval.fulfilled, (state, action) => {
      state.projectSettings[action.meta.arg.projectId] = action.payload;
    });
  },
});

export const {setSoilIdStatus} = soilDataSlice.actions;

/** @deprecated Use pushSiteData from soilDataGlobalReducer instead */
export const pushSoilData = createAsyncThunk(
  'soilId/pushSoilData',
  soilDataActions.pushSoilDataThunk,
);

export const updateSoilData = createAsyncThunk(
  'soilId/updateSoilData',
  soilDataActions.updateSoilDataThunk,
);

export const updateDepthDependentSoilData = createAsyncThunk(
  'soilId/updateDepthDependentSoilData',
  soilDataActions.updateDepthDependentSoilDataThunk,
);

export const updateSoilDataDepthInterval = createAsyncThunk(
  'soilId/updateSoilDataDepthInterval',
  soilDataActions.updateSoilDataDepthIntervalThunk,
);

export const deleteSoilDataDepthInterval = createAsyncThunk(
  'soilId/deleteSoilDataDepthInterval',
  soilDataActions.deleteSoilDataDepthIntervalThunk,
);

export const updateProjectSoilSettings = createAsyncThunk(
  'soilId/updateProjectSoilSettings',
  soilDataService.updateProjectSoilSettings,
);

export const updateProjectDepthInterval = createAsyncThunk(
  'soilId/updateProjectDepthInterval',
  soilDataService.updateProjectDepthInterval,
);

export const deleteProjectDepthInterval = createAsyncThunk(
  'soilId/deleteProjectDepthInterval',
  soilDataService.deleteProjectDepthInterval,
);

export default soilDataSlice.reducer;
