/*
 * Copyright © 2025 Technology Matters
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

import {renderSelectorHook} from '@testing/integration/utils';

import {initialState as accountInitialState} from 'terraso-client-shared/account/accountSlice';

import {LoadingState} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {
  markEntityError,
  markEntityModified,
} from 'terraso-mobile-client/model/sync/records';
import {initialState as syncInitialState} from 'terraso-mobile-client/model/sync/syncSlice';
import {ColorWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorScreen';
import {
  useSyncErrorSiteIds,
  useUnsyncedSiteIds,
} from 'terraso-mobile-client/store/sync/hooks/syncHooks';

// Note: Using a function here to guarantee test isolation (so tests cannot accidentally mutate state used by other tests)
const createAppState = () => ({
  account: accountInitialState,
  map: {userLocation: {accuracyM: null, coords: null}},
  elevation: {elevationCache: {}},
  notifications: {messages: {}},
  preferences: {colorWorkflow: 'MANUAL' as ColorWorkflow},
  project: {projects: {}},
  site: {sites: {}},
  soilData: {
    projectSettings: {},
    soilSync: {},
    soilData: {},
    status: 'ready' as LoadingState,
  },
  soilIdMatch: {
    locationBasedMatches: {},
    siteDataBasedMatches: {},
  },
  soilMetadata: {
    soilMetadata: {},
    soilMetadataSync: {},
  },
  sync: syncInitialState,
});

test('useSyncErrorSiteIds returns combined errors', () => {
  const state = createAppState();
  const at = Date.now();
  const soilSync = state.soilData.soilSync;
  const metadataSync = state.soilMetadata.soilMetadataSync;
  markEntityError(
    soilSync,
    'siteA',
    {value: 'DOES_NOT_EXIST', revisionId: 1},
    at,
  );
  markEntityError(
    soilSync,
    'siteB',
    {value: 'INVALID_DATA', revisionId: 1},
    at,
  );
  markEntityError(
    metadataSync,
    'siteB',
    {value: 'NOT_ALLOWED', revisionId: 1},
    at,
  );
  markEntityError(
    metadataSync,
    'siteC',
    {value: 'DOES_NOT_EXIST', revisionId: 1},
    at,
  );

  const result = renderSelectorHook(() => useSyncErrorSiteIds(), state);

  expect(result).toEqual(['siteA', 'siteB', 'siteC']);
});

test('useUnsyncedSiteIds returns combined unsynced site IDs from soil data and metadata', () => {
  const state = createAppState();
  const at = Date.now();
  const soilSync = state.soilData.soilSync;
  const metadataSync = state.soilMetadata.soilMetadataSync;

  // Mark sites as modified (unsynced) in both soil data and metadata
  markEntityModified(soilSync, 'siteA', at);
  markEntityModified(soilSync, 'siteB', at);
  markEntityModified(metadataSync, 'siteB', at); // siteB appears in both
  markEntityModified(metadataSync, 'siteC', at);

  const result = renderSelectorHook(() => useUnsyncedSiteIds(), state);

  // Should return unique site IDs from both sources, sorted
  expect(result).toEqual(['siteA', 'siteB', 'siteC']);
});

test('useUnsyncedSiteIds returns empty array when no unsynced sites', () => {
  const state = createAppState();

  const result = renderSelectorHook(() => useUnsyncedSiteIds(), state);

  expect(result).toEqual([]);
});

test('useUnsyncedSiteIds returns only soil data unsynced sites when metadata is empty', () => {
  const state = createAppState();
  const at = Date.now();
  const soilSync = state.soilData.soilSync;

  markEntityModified(soilSync, 'siteA', at);
  markEntityModified(soilSync, 'siteB', at);

  const result = renderSelectorHook(() => useUnsyncedSiteIds(), state);

  expect(result).toEqual(['siteA', 'siteB']);
});

test('useUnsyncedSiteIds returns only metadata unsynced sites when soil data is empty', () => {
  const state = createAppState();
  const at = Date.now();
  const metadataSync = state.soilMetadata.soilMetadataSync;

  markEntityModified(metadataSync, 'siteA', at);
  markEntityModified(metadataSync, 'siteC', at);

  const result = renderSelectorHook(() => useUnsyncedSiteIds(), state);

  expect(result).toEqual(['siteA', 'siteC']);
});
