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

import {Draft} from '@reduxjs/toolkit';

import * as siteService from 'terraso-client-shared/site/siteService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {
  addSiteToProject,
  removeSiteFromAllProjects,
  removeSiteFromProject,
} from 'terraso-mobile-client/model/project/projectSlice';
import * as siteActions from 'terraso-mobile-client/model/site/actions/siteActions';
import {
  deleteSites,
  updateProjectOfSite,
  updateSites,
} from 'terraso-mobile-client/model/site/siteSlice';
import {deleteSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {deleteSiteMatches} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {deleteSoilMetadata} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import {markEntityModified} from 'terraso-mobile-client/model/sync/records';
import {logSyncChange} from 'terraso-mobile-client/model/sync/syncDebugLog';
import {
  AppState,
  createGlobalReducer,
} from 'terraso-mobile-client/store/reducers';

export const addSite = createAsyncThunk(
  'site/addSite',
  siteActions.addSiteAction,
);

export const updateSite = createAsyncThunk(
  'site/updateSite',
  siteActions.updateSiteAction,
);

// Used for update actions that are not yet supported offline
export const onlineOnlyUpdateSite = createAsyncThunk(
  'site/onlineOnlyUpdateSite',
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

// Removes a site everywhere it can be referenced: the site record itself, its sync entry, its project's sites set, and all soil-related data keyed by siteId. Shared between deleteSite (user action) and deleteProject (cascade), so a site's disappearance from Redux is defined in one place.
export const cascadeSiteDeletion = (state: Draft<AppState>, siteId: string) => {
  removeSiteFromAllProjects(state.project, siteId);
  deleteSites(state.site, [siteId]);
  deleteSoilData(state.soilData, [siteId]);
  deleteSoilMetadata(state.soilMetadata, [siteId]);
  deleteSiteMatches(state.soilIdMatch, [siteId]);
};

export const siteGlobalReducer = createGlobalReducer(builder => {
  builder.addCase(addSite.fulfilled, (state, {payload}) => {
    if (payload.projectId) {
      addSiteToProject(state.project, {
        siteId: payload.id,
        projectId: payload.projectId,
      });
    }
    updateSites(state.site, {[payload.id]: payload});
    markEntityModified(state.site.siteSync, payload.id, Date.now());
    logSyncChange(
      'addSite',
      'site',
      payload.id,
      state.site.siteSync[payload.id],
      state.site.sites[payload.id],
    );
  });

  builder.addCase(updateSite.fulfilled, (state, {payload}) => {
    updateSites(state.site, {[payload.id]: payload});
    markEntityModified(state.site.siteSync, payload.id, Date.now());
    logSyncChange(
      'updateSite',
      'site',
      payload.id,
      state.site.siteSync[payload.id],
      state.site.sites[payload.id],
    );
  });

  builder.addCase(onlineOnlyUpdateSite.fulfilled, (state, {payload}) => {
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
    state.site.siteDeletedByUser = true;
    cascadeSiteDeletion(state, payload);
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
