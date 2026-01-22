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

import {setUsers} from 'terraso-client-shared/account/accountSlice';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import * as syncService from 'terraso-client-shared/soilId/syncService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {setLastPullTimestamp} from 'terraso-mobile-client/model/devOnly/devOnlySlice';
import {setExportTokens} from 'terraso-mobile-client/model/export/exportSlice';
import {setProjects} from 'terraso-mobile-client/model/project/projectSlice';
import {setSites} from 'terraso-mobile-client/model/site/siteSlice';
import {
  setProjectSettings,
  setSoilData,
  updateSoilIdStatus,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {setSoilMetadata} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import * as syncActions from 'terraso-mobile-client/model/sync/actions/syncActions';
import {applySyncResults} from 'terraso-mobile-client/model/sync/results';
import {createGlobalReducer} from 'terraso-mobile-client/store/reducers';

export const pullUserData = createAsyncThunk(
  'sync/pullUserData',
  syncService.pullUserData,
);

export const pushUserData = createAsyncThunk(
  'sync/pushUserData',
  syncActions.pushUserData,
);

export const syncGlobalReducer = createGlobalReducer(builder => {
  builder.addCase(pullUserData.fulfilled, (state, {payload}) => {
    setProjects(state.project, payload.projects);
    setSites(state.site, payload.sites);
    setUsers(state.account, payload.users);
    setProjectSettings(state.soilData, payload.projectSoilSettings);
    setSoilData(state.soilData, payload.soilData);
    setSoilMetadata(state.soilMetadata, payload.soilMetadata);
    setExportTokens(state.export, payload.exportTokens);
    updateSoilIdStatus(state.soilData, 'ready');
    setLastPullTimestamp(state.devOnly, Date.now());
  });

  builder.addCase(pullUserData.pending, state => {
    updateSoilIdStatus(state.soilData, 'loading');
  });

  builder.addCase(pullUserData.rejected, state => {
    updateSoilIdStatus(state.soilData, 'error');
  });

  builder.addCase(pushUserData.fulfilled, (state, action) => {
    const {soilDataResults, soilMetadataResults} = action.payload;

    if (soilDataResults) {
      applySyncResults(
        state.soilData.soilData as Record<string, SoilData>,
        state.soilData.soilSync,
        soilDataResults,
        Date.now(),
      );
    }

    if (soilMetadataResults) {
      applySyncResults(
        state.soilMetadata.soilMetadata as Record<string, SoilMetadata>,
        state.soilMetadata.soilMetadataSync,
        soilMetadataResults,
        Date.now(),
      );
    }
  });

  builder.addCase(pushUserData.rejected, (_state, action) => {
    console.error('pushUserData failed:', action.error);
  });
});
