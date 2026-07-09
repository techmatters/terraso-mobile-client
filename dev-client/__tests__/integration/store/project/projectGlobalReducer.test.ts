/*
 * Copyright © 2026 Technology Matters
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

import type {Project} from 'terraso-client-shared/project/projectTypes';
import type {Site} from 'terraso-client-shared/site/siteTypes';
import type {
  ProjectSoilSettings,
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {deleteProject} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {deleteSite} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import type {SoilIdEntry} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppState, createStore} from 'terraso-mobile-client/store';

const makeSite = (id: string, projectId?: string): Site =>
  ({
    id,
    name: `site-${id}`,
    latitude: 0,
    longitude: 0,
    elevation: 0,
    privacy: 'PRIVATE',
    archived: false,
    updatedAt: '',
    notes: {},
    projectId,
  }) as Site;

const makeProject = (id: string, siteIds: string[]): Project =>
  ({
    id,
    name: `project-${id}`,
    privacy: 'PRIVATE',
    measurementUnits: 'METRIC',
    description: '',
    updatedAt: '',
    memberships: {},
    sites: Object.fromEntries(siteIds.map(sid => [sid, true])),
    archived: false,
  }) as Project;

// Seeds a store where project P1 has two child sites (S1, S2), plus an unrelated site (S3) under project P2. Each site has soilData, soilMetadata, and a soilIdMatch entry; project P1 also has projectSettings. Used to verify that deletes cascade only to the intended siblings and leave unrelated data alone.
const seededStore = () =>
  createStore({
    project: {
      projects: {
        p1: makeProject('p1', ['s1', 's2']),
        p2: makeProject('p2', ['s3']),
      },
    },
    site: {
      sites: {
        s1: makeSite('s1', 'p1'),
        s2: makeSite('s2', 'p1'),
        s3: makeSite('s3', 'p2'),
      },
      siteSync: {
        s1: {revisionId: 1, lastSyncedRevisionId: 1},
        s2: {revisionId: 2, lastSyncedRevisionId: 1},
        s3: {revisionId: 1, lastSyncedRevisionId: 1},
      },
      siteDeletedByUser: false,
    } as Partial<AppState>['site'],
    soilData: {
      soilData: {
        s1: {} as SoilData,
        s2: {} as SoilData,
        s3: {} as SoilData,
      },
      soilSync: {},
      projectSettings: {
        p1: {} as ProjectSoilSettings,
        p2: {} as ProjectSoilSettings,
      },
      status: 'ready',
    },
    soilMetadata: {
      soilMetadata: {
        s1: {} as SoilMetadata,
        s2: {} as SoilMetadata,
        s3: {} as SoilMetadata,
      },
      soilMetadataSync: {},
    } as Partial<AppState>['soilMetadata'],
    soilIdMatch: {
      locationBasedMatches: {},
      siteDataBasedMatches: {
        s1: {} as SoilIdEntry,
        s2: {} as SoilIdEntry,
        s3: {} as SoilIdEntry,
      },
    },
  });

describe('deleteProject.fulfilled cascades to child sites and their data', () => {
  test('removes the project, its child sites, their sync records, soilData, soilMetadata, and siteMatches', () => {
    const store = seededStore();

    store.dispatch(deleteProject.fulfilled('p1', 'req-id', {id: 'p1'}));

    const state = store.getState();
    expect(state.project.projects.p1).toBeUndefined();
    expect(state.project.projects.p2).toBeDefined();

    expect(state.site.sites.s1).toBeUndefined();
    expect(state.site.sites.s2).toBeUndefined();
    expect(state.site.sites.s3).toBeDefined();

    expect(state.site.siteSync.s1).toBeUndefined();
    expect(state.site.siteSync.s2).toBeUndefined();
    expect(state.site.siteSync.s3).toBeDefined();

    expect(state.soilData.soilData.s1).toBeUndefined();
    expect(state.soilData.soilData.s2).toBeUndefined();
    expect(state.soilData.soilData.s3).toBeDefined();

    expect(state.soilMetadata.soilMetadata.s1).toBeUndefined();
    expect(state.soilMetadata.soilMetadata.s2).toBeUndefined();
    expect(state.soilMetadata.soilMetadata.s3).toBeDefined();

    expect(state.soilIdMatch.siteDataBasedMatches.s1).toBeUndefined();
    expect(state.soilIdMatch.siteDataBasedMatches.s2).toBeUndefined();
    expect(state.soilIdMatch.siteDataBasedMatches.s3).toBeDefined();
  });

  test('removes projectSettings for the deleted project only', () => {
    const store = seededStore();

    store.dispatch(deleteProject.fulfilled('p1', 'req-id', {id: 'p1'}));

    const state = store.getState();
    expect(state.soilData.projectSettings.p1).toBeUndefined();
    expect(state.soilData.projectSettings.p2).toBeDefined();
  });

  test('does not set siteDeletedByUser (project-level suppression is handled elsewhere)', () => {
    const store = seededStore();

    store.dispatch(deleteProject.fulfilled('p1', 'req-id', {id: 'p1'}));

    expect(store.getState().site.siteDeletedByUser).toBe(false);
  });

  test('is a no-op when the project is not in state', () => {
    const store = seededStore();
    const before = store.getState();

    store.dispatch(deleteProject.fulfilled('nope', 'req-id', {id: 'nope'}));

    expect(store.getState()).toEqual(before);
  });
});

// The cascade helper is shared with deleteSite. If the refactor accidentally changed deleteSite's behavior, this test catches it.
describe('deleteSite.fulfilled still cleans up the site and sets siteDeletedByUser', () => {
  test('removes site, siteSync, soilData, soilMetadata, siteMatches, and clears project.sites entry', () => {
    const store = seededStore();

    store.dispatch(deleteSite.fulfilled('s1', 'req-id', makeSite('s1', 'p1')));

    const state = store.getState();
    expect(state.site.sites.s1).toBeUndefined();
    expect(state.site.sites.s2).toBeDefined();
    expect(state.site.siteSync.s1).toBeUndefined();
    expect(state.soilData.soilData.s1).toBeUndefined();
    expect(state.soilMetadata.soilMetadata.s1).toBeUndefined();
    expect(state.soilIdMatch.siteDataBasedMatches.s1).toBeUndefined();
    expect(state.project.projects.p1.sites.s1).toBeUndefined();
    expect(state.project.projects.p1.sites.s2).toBe(true);
    expect(state.site.siteDeletedByUser).toBe(true);
  });
});
