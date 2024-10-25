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
import {updateSites} from 'terraso-mobile-client/model/site/siteSlice';
import {updateProjectSettings} from 'terraso-mobile-client/model/soilId/soilIdSlice';
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
    updateProjectSettings(state.soilId, payload.soilSettings);
  });

  builder.addCase(addProject.fulfilled, (state, {payload}) => {
    updateProjects(state.project, {[payload.project.id]: payload.project});
    updateSites(state.site, payload.sites);
    updateUsers(state.account, payload.users);
    updateProjectSettings(state.soilId, payload.soilSettings);
  });

  builder.addCase(updateProject.fulfilled, (state, {payload}) => {
    updateProjects(state.project, {[payload.project.id]: payload.project});
    updateSites(state.site, payload.sites);
    updateUsers(state.account, payload.users);
    updateProjectSettings(state.soilId, payload.soilSettings);
  });
});
