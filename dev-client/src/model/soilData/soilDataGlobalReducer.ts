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
import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {setProjects} from 'terraso-mobile-client/model/project/projectSlice';
import {setSites} from 'terraso-mobile-client/model/site/siteSlice';
import {
  setProjectSettings,
  setSoilData,
  updateSoilIdStatus,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {setSoilMetadata} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import {createGlobalReducer} from 'terraso-mobile-client/store/reducers';

export const fetchSoilDataForUser = createAsyncThunk(
  'soilId/fetchSoilDataForUser',
  soilDataService.fetchSoilDataForUser,
);

export const soilIdGlobalReducer = createGlobalReducer(builder => {
  builder.addCase(fetchSoilDataForUser.fulfilled, (state, {payload}) => {
    setProjects(state.project, payload.projects);
    setSites(state.site, payload.sites);
    setUsers(state.account, payload.users);
    setProjectSettings(state.soilData, payload.projectSoilSettings);
    setSoilData(state.soilData, payload.soilData);
    setSoilMetadata(state.soilMetadata, payload.soilMetadata);
    updateSoilIdStatus(state.soilData, 'ready');
  });

  builder.addCase(fetchSoilDataForUser.pending, state => {
    updateSoilIdStatus(state.soilData, 'loading');
  });

  builder.addCase(fetchSoilDataForUser.rejected, state => {
    updateSoilIdStatus(state.soilData, 'error');
  });
});
