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

import {createAction, createSlice, PayloadAction} from '@reduxjs/toolkit';

import {
  addUser,
  setUsers,
  updateUsers,
} from 'terraso-client-shared/account/accountSlice';
import {ProjectAddUserMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import * as projectService from 'terraso-client-shared/project/projectService';
import {Project} from 'terraso-client-shared/project/projectTypes';
import {
  createAsyncThunk,
  dispatchByKeys,
} from 'terraso-client-shared/store/utils';

import {
  setSites,
  updateSites,
} from 'terraso-mobile-client/model/site/siteSlice';
import {updateProjectSettings} from 'terraso-mobile-client/model/soilId/soilIdSlice';

interface SiteKey {
  projectId: string;
  siteId: string;
}

const initialState = {
  projects: {} as Record<string, Project>,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<Record<string, Project>>) => {
      state.projects = action.payload;
    },
    updateProjects: (state, action: PayloadAction<Record<string, Project>>) => {
      Object.assign(state.projects, action.payload);
    },
  },
  extraReducers: builder => {
    builder.addCase(
      addSiteToProject,
      (state, {payload: {siteId, projectId}}) => {
        state.projects[projectId].sites[siteId] = true;
      },
    );

    builder.addCase(
      removeSiteFromProject,
      (state, {payload: {siteId, projectId}}) => {
        delete state.projects[projectId].sites[siteId];
      },
    );

    builder.addCase(removeSiteFromAllProjects, (state, {payload: siteId}) => {
      for (let project of Object.values(state.projects)) {
        if (siteId in project.sites) {
          delete project.sites[siteId];
        }
      }
    });

    builder.addCase(deleteProject.fulfilled, (state, {meta}) => {
      delete state.projects[meta.arg.id];
    });

    builder.addCase(
      archiveProject.fulfilled,
      (state, {meta, payload: archived}) => {
        state.projects[meta.arg.id].archived = archived;
      },
    );

    builder.addCase(
      addUserToProject.fulfilled,
      (state, {meta, payload: {id: membershipId, userRole, userId}}) => {
        state.projects[meta.arg.projectId].memberships[membershipId] = {
          id: membershipId,
          userRole,
          userId,
        };
      },
    );

    builder.addCase(
      updateUserRole.fulfilled,
      (state, {payload: {projectId, membershipId, userRole}}) => {
        state.projects[projectId].memberships[membershipId].userRole = userRole;
      },
    );

    builder.addCase(
      deleteUserFromProject.fulfilled,
      (state, {payload: {projectId, membershipId}}) => {
        delete state.projects[projectId].memberships[membershipId];
      },
    );
  },
});

export const {setProjects, updateProjects} = projectSlice.actions;

export const addSiteToProject = createAction<SiteKey>(
  'project/addSiteToProject',
);

export const removeSiteFromProject = createAction<SiteKey>(
  'project/removeSiteFromProject',
);

export const removeSiteFromAllProjects = createAction<string>(
  'project/removeSiteFromAllProjects',
);

const updateDispatchMap = () => ({
  project: (project: Project) => updateProjects({[project.id]: project}),
  sites: updateSites,
  users: updateUsers,
  soilSettings: updateProjectSettings,
});

export const fetchProject = createAsyncThunk(
  'project/fetchProject',
  dispatchByKeys(projectService.fetchProject, updateDispatchMap),
);

export const fetchProjectsForUser = createAsyncThunk(
  'project/fetchProjectsForUser',
  dispatchByKeys(projectService.fetchProjectsForUser, () => ({
    projects: setProjects,
    sites: setSites,
    users: setUsers,
    soilSettings: updateProjectSettings,
  })),
);

export const addProject = createAsyncThunk(
  'project/addProject',
  dispatchByKeys(projectService.addProject, updateDispatchMap),
);

export const updateProject = createAsyncThunk(
  'project/updateProject',
  dispatchByKeys(projectService.updateProject, updateDispatchMap),
);

export const deleteProject = createAsyncThunk(
  'project/deleteProject',
  projectService.deleteProject,
);

export const archiveProject = createAsyncThunk(
  'project/archiveProject',
  projectService.archiveProject,
);

export const addUserToProject = createAsyncThunk(
  'project/addUser',
  async (input: ProjectAddUserMutationInput, _, {dispatch}) => {
    const res = await projectService.addUserToProject(input);
    dispatch(addUser(res.user));
    return res.membership;
  },
);

export const updateUserRole = createAsyncThunk(
  'project/updateUserRole',
  projectService.updateUserRole,
);

export const deleteUserFromProject = createAsyncThunk(
  'project/deleteUserFromProject',
  projectService.deleteUserFromProject,
);

export default projectSlice.reducer;
