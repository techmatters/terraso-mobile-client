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

import {createSlice, Draft} from '@reduxjs/toolkit';

import * as projectService from 'terraso-client-shared/project/projectService';
import {
  Project,
  ProjectMembership,
} from 'terraso-client-shared/project/projectTypes';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

export const initialState = {
  projects: {} as Record<string, Project>,
};

type State = typeof initialState;

export const setProjects = (
  state: Draft<State>,
  projects: Record<string, Project>,
) => {
  state.projects = projects;
};

export const updateProjects = (
  state: Draft<State>,
  projects: Record<string, Project>,
) => {
  Object.assign(state.projects, projects);
};

export const updateMembership = (
  state: Draft<State>,
  args: {projectId: string; membership: ProjectMembership},
) => {
  state.projects[args.projectId].memberships[args.membership.id] =
    args.membership;
};

export const addSiteToProject = (
  state: Draft<State>,
  args: {siteId: string; projectId: string},
) => {
  state.projects[args.projectId].sites[args.siteId] = true;
};

export const removeSiteFromProject = (
  state: Draft<State>,

  args: {siteId: string; projectId: string},
) => {
  delete state.projects[args.projectId].sites[args.siteId];
};

export const removeSiteFromAllProjects = (
  state: Draft<State>,
  siteId: string,
) => {
  for (const project of Object.values(state.projects)) {
    if (siteId in project.sites) {
      delete project.sites[siteId];
    }
  }
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {},
  extraReducers: builder => {
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

export const deleteProject = createAsyncThunk(
  'project/deleteProject',
  projectService.deleteProject,
);

export const archiveProject = createAsyncThunk(
  'project/archiveProject',
  projectService.archiveProject,
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
