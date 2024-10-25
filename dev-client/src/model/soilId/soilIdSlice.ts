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

import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import * as soilIdService from 'terraso-client-shared/soilId/soilIdService';
import {
  CollectionMethod,
  DisabledCollectionMethod,
  LoadingState,
  ProjectSoilSettings,
  SoilData,
  SoilIdEntry,
  SoilIdKey,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import * as soilDataActions from 'terraso-mobile-client/model/soilId/actions/soilDataActions';
import {
  soilIdEntryDataBased,
  soilIdEntryForStatus,
  soilIdEntryLocationBased,
  soilIdKey,
} from 'terraso-mobile-client/model/soilId/soilIdFunctions';
import {
  ChangeRecords,
  markChanged,
} from 'terraso-mobile-client/model/sync/sync';

export * from 'terraso-client-shared/soilId/soilIdTypes';
export * from 'terraso-mobile-client/model/soilId/soilIdFunctions';

export type MethodRequired<
  T extends CollectionMethod | DisabledCollectionMethod,
> = `${T}Required`;

export type SoilState = {
  soilData: Record<string, SoilData | undefined>;
  soilChanges: ChangeRecords<SoilData>;

  projectSettings: Record<string, ProjectSoilSettings | undefined>;
  status: LoadingState;

  matches: Record<SoilIdKey, SoilIdEntry>;
};

export const initialState: SoilState = {
  soilData: {},
  soilChanges: {},

  projectSettings: {},
  status: 'loading',

  matches: {},
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
  state.soilData = soilData;
  state.matches = {};
  state.soilChanges = {};
};

export const deleteSoilData = (state: Draft<SoilState>, siteIds: string[]) => {
  for (const siteId of siteIds) {
    delete state.soilData[siteId];
  }
  flushDataBasedMatches(state);
};

const soilIdSlice = createSlice({
  name: 'soilId',
  initialState,
  reducers: {
    setSoilIdStatus: (state, action: PayloadAction<LoadingState>) => {
      state.status = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(updateSoilData.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markChanged(state.soilChanges, action.meta.arg.siteId, Date.now());
      flushDataBasedMatches(state);
    });

    builder.addCase(updateDepthDependentSoilData.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markChanged(state.soilChanges, action.meta.arg.siteId, Date.now());
      flushDataBasedMatches(state);
    });

    builder.addCase(updateSoilDataDepthInterval.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markChanged(state.soilChanges, action.meta.arg.siteId, Date.now());
      flushDataBasedMatches(state);
    });

    builder.addCase(deleteSoilDataDepthInterval.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload;
      markChanged(state.soilChanges, action.meta.arg.siteId, Date.now());
      flushDataBasedMatches(state);
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

    builder.addCase(fetchLocationBasedSoilMatches.pending, (state, action) => {
      const key = soilIdKey(action.meta.arg);
      state.matches[key] = soilIdEntryForStatus('loading');
    });

    builder.addCase(fetchLocationBasedSoilMatches.rejected, (state, action) => {
      const key = soilIdKey(action.meta.arg);
      state.matches[key] = soilIdEntryForStatus('error');
    });

    builder.addCase(
      fetchLocationBasedSoilMatches.fulfilled,
      (state, action) => {
        const key = soilIdKey(action.meta.arg);
        if (action.payload.__typename === 'SoilIdFailure') {
          state.matches[key] = soilIdEntryForStatus(action.payload.reason);
        } else {
          state.matches[key] = soilIdEntryLocationBased(action.payload.matches);
        }
      },
    );

    builder.addCase(fetchDataBasedSoilMatches.pending, (state, action) => {
      const key = soilIdKey(action.meta.arg.coords, action.meta.arg.siteId);
      state.matches[key] = soilIdEntryForStatus('loading');
    });

    builder.addCase(fetchDataBasedSoilMatches.rejected, (state, action) => {
      const key = soilIdKey(action.meta.arg.coords, action.meta.arg.siteId);
      state.matches[key] = soilIdEntryForStatus('error');
    });

    builder.addCase(fetchDataBasedSoilMatches.fulfilled, (state, action) => {
      const key = soilIdKey(action.meta.arg.coords, action.meta.arg.siteId);
      if (action.payload.__typename === 'SoilIdFailure') {
        state.matches[key] = soilIdEntryForStatus(action.payload.reason);
      } else {
        state.matches[key] = soilIdEntryDataBased(action.payload.matches);
      }
    });
  },
});

const flushDataBasedMatches = (state: Draft<SoilState>) => {
  /*
   * When soil ID input data changes (e.g. samples, intervals), we clear any
   * cached entries that are data-based since they aren't valid anymore.
   */
  Object.keys(state.matches)
    .filter(key => state.matches[key as SoilIdKey].dataBasedMatches?.length)
    .forEach(key => delete state.matches[key as SoilIdKey]);
};

export const {setSoilIdStatus} = soilIdSlice.actions;

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

export const fetchLocationBasedSoilMatches = createAsyncThunk(
  'soilId/fetchLocationBasedSoilMatches',
  soilIdService.fetchLocationBasedSoilMatches,
);

export const fetchDataBasedSoilMatches = createAsyncThunk(
  'soilId/fetchDataBasedSoilMatches',
  soilIdService.fetchDataBasedSoilMatches,
);

export default soilIdSlice.reducer;
