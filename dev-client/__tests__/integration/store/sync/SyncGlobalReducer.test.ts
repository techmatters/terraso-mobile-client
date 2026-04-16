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

import type {Site} from 'terraso-client-shared/site/siteTypes';

import {
  isUnsynced,
  type SyncRecord,
} from 'terraso-mobile-client/model/sync/records';
import {pullUserData} from 'terraso-mobile-client/model/sync/syncGlobalReducer';
import {createStore} from 'terraso-mobile-client/store';
import type {AppState} from 'terraso-mobile-client/store';

const makeSite = (id: string, elevation: number | null): Site => ({
  id,
  name: `Site ${id}`,
  latitude: 10,
  longitude: 20,
  elevation,
  privacy: 'PRIVATE',
  archived: false,
  updatedAt: '2024-01-01T00:00:00Z',
  notes: {},
});

const makePullPayload = (sites: Record<string, Site>) =>
  ({
    sites,
    projects: {},
    users: {},
    projectSoilSettings: {},
    soilData: {},
    soilMetadata: {},
    exportTokens: [],
  }) as any;

describe('syncGlobalReducer: marking sites missing elevation as modified on pull', () => {
  test('marks a newly-pulled site with null elevation as modified', () => {
    const store = createStore();

    store.dispatch(
      pullUserData.fulfilled(
        makePullPayload({'site-1': makeSite('site-1', null)}),
        'requestId',
        'userId',
      ),
    );

    const {siteSync} = store.getState().site;
    expect(isUnsynced(siteSync['site-1'])).toBe(true);
  });

  test('marks a previously-synced site with missing elevation as modified after pull', () => {
    // Scenario: site already existed on server with no elevation set
    const syncedRecord: SyncRecord<Site, unknown> = {
      revisionId: 1,
      lastSyncedRevisionId: 1,
    };
    const store = createStore({
      site: {
        sites: {'site-1': makeSite('site-1', null)},
        siteSync: {'site-1': syncedRecord},
        siteDeletedByUser: false,
      } as Partial<AppState>['site'],
    } as Partial<AppState>);

    store.dispatch(
      pullUserData.fulfilled(
        makePullPayload({'site-1': makeSite('site-1', null)}),
        'requestId',
        'userId',
      ),
    );

    const {siteSync} = store.getState().site;
    expect(isUnsynced(siteSync['site-1'])).toBe(true);
  });

  test('does not re-mark an already-unsynced site with missing elevation', () => {
    // Scenario: site was created or modified locally but push has not completed
    // (e.g. API timed out or errored). The site is already queued for push.
    const unsyncedRecord: SyncRecord<Site, unknown> = {
      revisionId: 2,
      lastSyncedRevisionId: 1,
    };
    const store = createStore({
      site: {
        sites: {'site-1': makeSite('site-1', null)},
        siteSync: {'site-1': unsyncedRecord},
        siteDeletedByUser: false,
      } as Partial<AppState>['site'],
    } as Partial<AppState>);

    store.dispatch(
      pullUserData.fulfilled(
        makePullPayload({'site-1': makeSite('site-1', null)}),
        'requestId',
        'userId',
      ),
    );

    const {siteSync} = store.getState().site;
    // The site is still unsynced, but revisionId was not incremented further
    expect(siteSync['site-1'].revisionId).toBe(2);
  });

  test('does not mark a site that has elevation as modified', () => {
    const store = createStore();

    store.dispatch(
      pullUserData.fulfilled(
        makePullPayload({'site-1': makeSite('site-1', 150)}),
        'requestId',
        'userId',
      ),
    );

    const {siteSync} = store.getState().site;
    // A brand-new record from pull with elevation should not be marked unsynced
    expect(isUnsynced(siteSync['site-1'] ?? {})).toBe(false);
  });

  test('only marks sites missing elevation among multiple pulled sites', () => {
    const store = createStore();

    store.dispatch(
      pullUserData.fulfilled(
        makePullPayload({
          'site-with-elevation': makeSite('site-with-elevation', 100),
          'site-missing-elevation': makeSite('site-missing-elevation', null),
        }),
        'requestId',
        'userId',
      ),
    );

    const {siteSync} = store.getState().site;
    expect(isUnsynced(siteSync['site-with-elevation'] ?? {})).toBe(false);
    expect(isUnsynced(siteSync['site-missing-elevation'])).toBe(true);
  });
});
