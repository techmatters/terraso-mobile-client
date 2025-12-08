/*
 * Copyright © 2023-2024 Technology Matters
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
import {cloneDeep} from 'lodash';

import {initialState as accountInitialState} from 'terraso-client-shared/account/accountSlice';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  selectSoilDataSyncErrorSiteIds,
  selectUnsyncedSoilDataSiteIds,
} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {
  errorRecord,
  initialRecord,
  markEntityModified,
  markEntitySynced,
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {initialState as syncInitialState} from 'terraso-mobile-client/model/sync/syncSlice';
import {AppState, useSelector} from 'terraso-mobile-client/store';

const appState = (): AppState => {
  return {
    account: accountInitialState,
    map: {userLocation: {accuracyM: null, coords: null}},
    elevation: {elevationCache: {}},
    export: {tokens: {}},
    notifications: {messages: {}},
    preferences: {colorWorkflow: 'MANUAL'},
    project: {projects: {}},
    site: {sites: {}},
    soilData: {
      projectSettings: {},
      soilSync: {},
      soilData: {},
      status: 'ready',
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
  };
};

const soilData = (): SoilData => {
  return {
    depthIntervalPreset: 'CUSTOM',
    depthDependentData: [],
    depthIntervals: [],
  };
};

describe('selectUnsyncedSoilDataSiteIds', () => {
  test('selects unsynced site IDs only, sorted', () => {
    const state = appState();
    const now = Date.now();
    markEntitySynced(state.soilData.soilSync, 'a', {value: soilData()}, now);

    markEntityModified(state.soilData.soilSync, 'c', now);
    markEntityModified(state.soilData.soilSync, 'b', now);

    const selected = renderSelectorHook(
      () => useSelector(selectUnsyncedSoilDataSiteIds),
      state,
    );

    expect(selected).toEqual(['b', 'c']);
  });

  test('returns stable values for input states', () => {
    const stateA = appState();
    markEntityModified(stateA.soilData.soilSync, 'a', Date.now());

    const selectedA1 = renderSelectorHook(
      () => useSelector(selectUnsyncedSoilDataSiteIds),
      stateA,
    );
    const selectedA2 = renderSelectorHook(
      () => useSelector(selectUnsyncedSoilDataSiteIds),
      stateA,
    );

    const stateAclone = cloneDeep(stateA);
    const selectedA3 = renderSelectorHook(
      () => useSelector(selectUnsyncedSoilDataSiteIds),
      stateAclone,
    );

    const stateB = cloneDeep(stateA);
    markEntityModified(stateB.soilData.soilSync, 'b', Date.now());

    const selectedB = renderSelectorHook(
      () => useSelector(selectUnsyncedSoilDataSiteIds),
      stateB,
    );

    expect(selectedA1).toBe(selectedA2);
    // A1=A3 should be a result of the shallowEqual memoizeOptions
    expect(selectedA1).toBe(selectedA3);

    expect(selectedA1).not.toBe(selectedB);
    expect(selectedA2).not.toBe(selectedB);
    expect(selectedA3).not.toBe(selectedB);
  });
});

const createMockState = (
  soilSync: SyncRecords<any, any>,
): Partial<AppState> => ({
  soilData: {
    soilSync,
  } as any,
});

/*
 * Test to verify that selectSoilDataSyncErrorSiteIds properly memoizes
 * even when upstream selectors return new object references
 */
describe('selectSoilDataSyncErrorSiteIds memoization', () => {
  it('should return same reference when error site IDs have not changed', () => {
    // Create initial state with error sites
    const errorSite1: SyncRecord<any, any> = errorRecord(
      initialRecord(undefined),
      {value: 'ERROR_1', revisionId: 1},
      Date.now(),
    );
    const errorSite2: SyncRecord<any, any> = errorRecord(
      initialRecord(undefined),
      {value: 'ERROR_2', revisionId: 1},
      Date.now(),
    );

    const state1 = createMockState({
      site1: errorSite1,
      site2: errorSite2,
      site3: initialRecord(undefined), // Not an error
    }) as AppState;

    const result1 = selectSoilDataSyncErrorSiteIds(state1);

    // Create a new state object (simulating a Redux update)
    // but with the same error sites
    const state2 = createMockState({
      site1: errorSite1, // Same reference
      site2: errorSite2, // Same reference
      site3: initialRecord(undefined), // Different reference but not an error
    }) as AppState;

    const result2 = selectSoilDataSyncErrorSiteIds(state2);

    // Verify the content is the same
    expect(result1).toEqual(['site1', 'site2']);
    expect(result2).toEqual(['site1', 'site2']);

    // CRITICAL TEST: Verify reference is the same (memoization worked)
    expect(result1).toBe(result2);
  });

  it('should return new reference when error site IDs have changed', () => {
    const errorSite1: SyncRecord<any, any> = errorRecord(
      initialRecord(undefined),
      {value: 'ERROR_1', revisionId: 1},
      Date.now(),
    );

    const state1 = createMockState({
      site1: errorSite1,
    }) as AppState;

    const result1 = selectSoilDataSyncErrorSiteIds(state1);

    // Add a new error site
    const errorSite2: SyncRecord<any, any> = errorRecord(
      initialRecord(undefined),
      {value: 'ERROR_2', revisionId: 1},
      Date.now(),
    );

    const state2 = createMockState({
      site1: errorSite1,
      site2: errorSite2, // New error
    }) as AppState;

    const result2 = selectSoilDataSyncErrorSiteIds(state2);

    // Verify the content is different
    expect(result1).toEqual(['site1']);
    expect(result2).toEqual(['site1', 'site2']);

    // Verify reference is different (content changed)
    expect(result1).not.toBe(result2);
  });
});
