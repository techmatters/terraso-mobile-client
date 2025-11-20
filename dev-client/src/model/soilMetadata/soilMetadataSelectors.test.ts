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

import {
  selectMetadataSyncErrorSiteIds,
  selectMetadataSyncErrorSites,
  selectSoilMetadataChanges,
  selectUnsyncedMetadataSiteIds,
  selectUnsyncedSoilMetadataSites,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {
  errorRecord,
  initialRecord,
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {AppState} from 'terraso-mobile-client/store';

describe('selectSoilMetadataChanges', () => {
  it('should select soilMetadataSync from state', () => {
    const mockSyncRecords = {
      'site-1': {revisionId: 1, lastModifiedAt: 100},
    };

    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: mockSyncRecords,
      },
    } as Partial<AppState> as AppState;

    const result = selectSoilMetadataChanges(state);
    expect(result).toBe(mockSyncRecords);
  });
});

describe('selectUnsyncedSoilMetadata', () => {
  it('should select unsynced soilMetadata records', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {
          'site-unsynced-1': {revisionId: 1},
          'site-synced': {revisionId: 2, lastSyncedRevisionId: 2},
          'site-unsynced-2': {revisionId: 3, lastSyncedRevisionId: 2},
        },
      },
    } as Partial<AppState> as AppState;

    const unsynced = selectUnsyncedSoilMetadataSites(state);
    expect(Object.keys(unsynced).sort()).toEqual([
      'site-unsynced-1',
      'site-unsynced-2',
    ]);
  });

  it('should return empty object when no unsynced records', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {
          'site-1': {revisionId: 1, lastSyncedRevisionId: 1},
          'site-2': {revisionId: 2, lastSyncedRevisionId: 2},
        },
      },
    } as Partial<AppState> as AppState;

    const unsynced = selectUnsyncedSoilMetadataSites(state);
    expect(Object.keys(unsynced)).toHaveLength(0);
  });

  it('should return empty object when soilMetadataSync is empty', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    } as Partial<AppState> as AppState;

    const unsynced = selectUnsyncedSoilMetadataSites(state);
    expect(Object.keys(unsynced)).toHaveLength(0);
  });
});

describe('selectUnsyncedMetadataSiteIds', () => {
  it('should return sorted site IDs for unsynced metadata', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {
          'site-zzz': {revisionId: 1},
          'site-aaa': {revisionId: 1},
          'site-mmm': {revisionId: 1},
        },
      },
    } as Partial<AppState> as AppState;

    const ids = selectUnsyncedMetadataSiteIds(state);
    expect(ids).toEqual(['site-aaa', 'site-mmm', 'site-zzz']);
  });

  it('should return empty array when no unsynced records', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {
          'site-1': {
            revisionId: 1,
            lastSyncedRevisionId: 1,
          },
        },
      },
    } as Partial<AppState> as AppState;

    const ids = selectUnsyncedMetadataSiteIds(state);
    expect(ids).toEqual([]);
  });

  it('should filter out synced records and return only unsynced IDs', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {
          'site-unsynced-1': {revisionId: 1},
          'site-synced': {revisionId: 2, lastSyncedRevisionId: 2},
          'site-unsynced-2': {revisionId: 3, lastSyncedRevisionId: 2},
        },
      },
    } as Partial<AppState> as AppState;

    const ids = selectUnsyncedMetadataSiteIds(state);
    expect(ids).toEqual(['site-unsynced-1', 'site-unsynced-2']);
  });
});

const createMockState = (
  soilMetadataSync: SyncRecords<any, any>,
): Partial<AppState> => ({
  soilMetadata: {
    soilMetadataSync,
  } as any,
});

describe('selectMetadataSyncErrorSiteIds memoization', () => {
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

    const result1 = selectMetadataSyncErrorSiteIds(state1);

    // Create a new state object (simulating a Redux update)
    // but with the same error sites
    const state2 = createMockState({
      site1: errorSite1, // Same reference
      site2: errorSite2, // Same reference
      site3: initialRecord(undefined), // Different reference but not an error
    }) as AppState;

    const result2 = selectMetadataSyncErrorSiteIds(state2);

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

    const result1 = selectMetadataSyncErrorSiteIds(state1);

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

    const result2 = selectMetadataSyncErrorSiteIds(state2);

    // Verify the content is different
    expect(result1).toEqual(['site1']);
    expect(result2).toEqual(['site1', 'site2']);

    // Verify reference is different (content changed)
    expect(result1).not.toBe(result2);
  });

  it('demonstrates that upstream selector returns new objects', () => {
    // This test proves that getErrorRecords always returns new objects
    const errorSite: SyncRecord<any, any> = errorRecord(
      initialRecord(undefined),
      {value: 'ERROR', revisionId: 1},
      Date.now(),
    );

    const state1 = createMockState({
      site1: errorSite,
    }) as AppState;

    const upstream1 = selectMetadataSyncErrorSites(state1);

    const state2 = createMockState({
      site1: errorSite, // Same error site reference
    }) as AppState;

    const upstream2 = selectMetadataSyncErrorSites(state2);

    // The upstream selector returns a new object (getErrorRecords behavior)
    expect(upstream1).not.toBe(upstream2);

    // But the content is the same (same SyncRecord references)
    expect(upstream1.site1).toBe(upstream2.site1);
  });
});
