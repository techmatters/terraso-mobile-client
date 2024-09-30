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

import {createSlice, PayloadAction} from '@reduxjs/toolkit';

import {setUsers} from 'terraso-client-shared/account/accountSlice';
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
import {
  createAsyncThunk,
  dispatchByKeys,
} from 'terraso-client-shared/store/utils';

import {setProjects} from 'terraso-mobile-client/model/project/projectSlice';
import {setSites} from 'terraso-mobile-client/model/site/siteSlice';
import {
  soilIdEntryDataBased,
  soilIdEntryForStatus,
  soilIdEntryLocationBased,
  soilIdKey,
} from 'terraso-mobile-client/model/soilId/soilIdFunctions';
import {SoilDataChangeSet} from 'terraso-mobile-client/model/soilId/sync/soilDataChanges';
import * as localSoilDataService from 'terraso-mobile-client/model/soilId/sync/soilDataService';
import {
  addSyncRecord,
  clearSyncRecords,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/syncRecords';

export * from 'terraso-client-shared/soilId/soilIdTypes';
export * from 'terraso-mobile-client/model/soilId/soilIdFunctions';

export type MethodRequired<
  T extends CollectionMethod | DisabledCollectionMethod,
> = `${T}Required`;

export type SoilState = {
  soilData: Record<string, SoilData | undefined>;
  soilDataSync: SyncRecords<SoilDataChangeSet>;

  projectSettings: Record<string, ProjectSoilSettings | undefined>;
  status: LoadingState;

  matches: Record<SoilIdKey, SoilIdEntry>;
};

const initialState: SoilState = {
  soilData: {},
  soilDataSync: {},

  projectSettings: {},
  status: 'loading',

  matches: {},
};

const soilIdSlice = createSlice({
  name: 'soilId',
  initialState,
  reducers: {
    setSoilData: (state, action: PayloadAction<Record<string, SoilData>>) => {
      state.soilData = action.payload;
      state.soilDataSync = {};
      state.matches = {};
    },
    setProjectSettings: (
      state,
      action: PayloadAction<Record<string, ProjectSoilSettings>>,
    ) => {
      state.projectSettings = action.payload;
    },
    updateProjectSettings: (
      state,
      action: PayloadAction<Record<string, ProjectSoilSettings>>,
    ) => {
      Object.assign(state.projectSettings, action.payload);
    },
    setSoilIdStatus: (
      state,
      action: PayloadAction<'loading' | 'error' | 'ready'>,
    ) => {
      state.status = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(syncSoilDataForUser.fulfilled, (state, action) => {
      Object.assign(state.soilData, action.payload);
      clearSyncRecords(state.soilDataSync, action.meta.arg);
      flushDataBasedMatches(state);
    });

    builder.addCase(updateSoilData.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload.result;
      addSyncRecord(
        state.soilDataSync,
        action.meta.arg.siteId,
        action.payload.changes,
      );
      flushDataBasedMatches(state);
    });

    builder.addCase(updateDepthDependentSoilData.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload.result;
      addSyncRecord(
        state.soilDataSync,
        action.meta.arg.siteId,
        action.payload.changes,
      );
      flushDataBasedMatches(state);
    });

    builder.addCase(updateSoilDataDepthInterval.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload.result;
      addSyncRecord(
        state.soilDataSync,
        action.meta.arg.siteId,
        action.payload.changes,
      );
      flushDataBasedMatches(state);
    });

    builder.addCase(deleteSoilDataDepthInterval.fulfilled, (state, action) => {
      state.soilData[action.meta.arg.siteId] = action.payload.result;
      addSyncRecord(
        state.soilDataSync,
        action.meta.arg.siteId,
        action.payload.changes,
      );
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

    builder.addCase(fetchSoilDataForUser.pending, state => {
      state.status = 'loading';
    });

    builder.addCase(fetchSoilDataForUser.rejected, state => {
      state.status = 'error';
    });

    builder.addCase(fetchSoilDataForUser.fulfilled, state => {
      state.status = 'ready';
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

const flushDataBasedMatches = (state: SoilState) => {
  /*
   * When soil ID input data changes (e.g. samples, intervals), we clear any
   * cached entries that are data-based since they aren't valid anymore.
   */
  Object.keys(state.matches)
    .filter(key => state.matches[key as SoilIdKey].dataBasedMatches?.length)
    .forEach(key => delete state.matches[key as SoilIdKey]);
};

export const {
  setProjectSettings,
  setSoilData,
  setSoilIdStatus,
  updateProjectSettings,
} = soilIdSlice.actions;

export const fetchSoilDataForUser = createAsyncThunk(
  'soilId/fetchSoilDataForUser',
  dispatchByKeys(soilDataService.fetchSoilDataForUser, () => ({
    projects: setProjects,
    sites: setSites,
    projectSoilSettings: setProjectSettings,
    soilData: setSoilData,
    users: setUsers,
  })),
);

export const syncSoilDataForUser = createAsyncThunk(
  'soilId/syncSoilDataForUser',
  localSoilDataService.syncSoilDataThunk,
);

export const updateSoilData = createAsyncThunk(
  'soilId/updateSoilData',
  localSoilDataService.updateSoilDataThunk,
);

export const updateDepthDependentSoilData = createAsyncThunk(
  'soilId/updateDepthDependentSoilData',
  localSoilDataService.updateDepthDependentSoilDataThunk,
);

export const updateSoilDataDepthInterval = createAsyncThunk(
  'soilId/updateSoilDataDepthInterval',
  localSoilDataService.updateDepthDependentSoilDataThunk,
);

export const deleteSoilDataDepthInterval = createAsyncThunk(
  'soilId/deleteSoilDataDepthInterval',
  localSoilDataService.deleteSoilDataDepthIntervalThunk,
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
