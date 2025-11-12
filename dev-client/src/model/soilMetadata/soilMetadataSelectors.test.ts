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
  selectSoilMetadataChanges,
  selectUnsyncedMetadataSiteIds,
  selectUnsyncedSoilMetadata,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
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

    const unsynced = selectUnsyncedSoilMetadata(state);
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

    const unsynced = selectUnsyncedSoilMetadata(state);
    expect(Object.keys(unsynced)).toHaveLength(0);
  });

  it('should return empty object when soilMetadataSync is empty', () => {
    const state = {
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    } as Partial<AppState> as AppState;

    const unsynced = selectUnsyncedSoilMetadata(state);
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
