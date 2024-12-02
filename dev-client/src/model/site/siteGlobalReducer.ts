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

import * as siteService from 'terraso-client-shared/site/siteService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {
  addSiteToProject,
  removeSiteFromAllProjects,
  removeSiteFromProject,
} from 'terraso-mobile-client/model/project/projectSlice';
import {
  deleteSites,
  updateProjectOfSite,
  updateSites,
} from 'terraso-mobile-client/model/site/siteSlice';
import {deleteSoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {deleteSoilMetadata} from 'terraso-mobile-client/model/soilId/soilMetadataSlice';
import {createGlobalReducer} from 'terraso-mobile-client/store/reducers';

export const addSite = createAsyncThunk('site/addSite', siteService.addSite);

export const updateSite = createAsyncThunk(
  'site/updateSite',
  siteService.updateSite,
);

export const deleteSite = createAsyncThunk(
  'site/deleteSite',
  siteService.deleteSite,
);

export const transferSites = createAsyncThunk(
  'site/transferSites',
  siteService.transferSitesToProject,
);

export const siteGlobalReducer = createGlobalReducer(builder => {
  builder.addCase(addSite.fulfilled, (state, {payload}) => {
    if (payload.projectId) {
      addSiteToProject(state.project, {
        siteId: payload.id,
        projectId: payload.projectId,
      });
    }
    updateSites(state.site, {[payload.id]: payload});
  });

  builder.addCase(updateSite.fulfilled, (state, {payload}) => {
    removeSiteFromAllProjects(state.project, payload.id);
    if (payload.projectId) {
      addSiteToProject(state.project, {
        siteId: payload.id,
        projectId: payload.projectId,
      });
    }
    updateSites(state.site, {[payload.id]: payload});
  });

  builder.addCase(deleteSite.fulfilled, (state, {payload}) => {
    removeSiteFromAllProjects(state.project, payload);
    deleteSites(state.site, [payload]);
    deleteSoilData(state.soilId, [payload]);
    deleteSoilMetadata(state.soilMetadata, [payload]);
  });

  builder.addCase(transferSites.fulfilled, (state, {payload}) => {
    for (const {siteId, oldProjectId} of payload.updated) {
      if (oldProjectId !== undefined) {
        removeSiteFromProject(state.project, {
          siteId,
          projectId: oldProjectId,
        });
      }
      addSiteToProject(state.project, {siteId, projectId: payload.projectId});
      updateProjectOfSite(state.site, {siteId, projectId: payload.projectId});
    }
  });
});
