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

import {addUser, updateUsers} from 'terraso-client-shared/account/accountSlice';
import * as projectService from 'terraso-client-shared/project/projectService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {
  updateMembership,
  updateProjects,
} from 'terraso-mobile-client/model/project/projectSlice';
import {cascadeSiteDeletion} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import {updateSites} from 'terraso-mobile-client/model/site/siteSlice';
import {
  deleteProjectSettings,
  updateProjectSettings,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {createGlobalReducer} from 'terraso-mobile-client/store/reducers';

export const fetchProject = createAsyncThunk(
  'project/fetchProject',
  projectService.fetchProject,
);

export const addProject = createAsyncThunk(
  'project/addProject',
  projectService.addProject,
);

export const updateProject = createAsyncThunk(
  'project/updateProject',
  projectService.updateProject,
);

export const addUserToProject = createAsyncThunk(
  'project/addUser',
  projectService.addUserToProject,
);

export const deleteProject = createAsyncThunk(
  'project/deleteProject',
  projectService.deleteProject,
);

export const projectGlobalReducer = createGlobalReducer(builder => {
  builder.addCase(addUserToProject.fulfilled, (state, {meta, payload}) => {
    updateMembership(state.project, {
      projectId: meta.arg.projectId,
      membership: payload.membership,
    });
    addUser(state.account, payload.user);
  });

  builder.addCase(fetchProject.fulfilled, (state, {payload}) => {
    updateProjects(state.project, {[payload.project.id]: payload.project});
    updateSites(state.site, payload.sites);
    updateUsers(state.account, payload.users);
    updateProjectSettings(state.soilData, payload.soilSettings);
  });

  builder.addCase(addProject.fulfilled, (state, {payload}) => {
    updateProjects(state.project, {[payload.project.id]: payload.project});
    updateSites(state.site, payload.sites);
    updateUsers(state.account, payload.users);
    updateProjectSettings(state.soilData, payload.soilSettings);
  });

  builder.addCase(updateProject.fulfilled, (state, {payload}) => {
    updateProjects(state.project, {[payload.project.id]: payload.project});
    updateSites(state.site, payload.sites);
    updateUsers(state.account, payload.users);
    updateProjectSettings(state.soilData, payload.soilSettings);
  });

  // Mirrors the backend's cascade: the server deletes child sites (and their soil data) when a project is deleted, so we need to delete them locally too. Otherwise sites, soilData, etc. keep a projectId reference to a project that no longer exists in Redux, breaking selectors that look up the project by that id.
  builder.addCase(deleteProject.fulfilled, (state, {meta}) => {
    const projectId = meta.arg.id;
    const project = state.project.projects[projectId];
    if (project !== undefined) {
      for (const siteId of Object.keys(project.sites)) {
        cascadeSiteDeletion(state, siteId);
      }
      delete state.project.projects[projectId];
    }
    deleteProjectSettings(state.soilData, projectId);
  });
});
