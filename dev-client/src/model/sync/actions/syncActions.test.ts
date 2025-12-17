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

import type {
  SoilDataPushFailureReason,
  SoilMetadataPushFailureReason,
  UserMatchRating,
} from 'terraso-client-shared/graphqlSchema/graphql';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import * as syncService from 'terraso-client-shared/soilId/syncService';

import {pushUserData} from 'terraso-mobile-client/model/sync/actions/syncActions';
import type {SyncRecords} from 'terraso-mobile-client/model/sync/records';
import type {AppState} from 'terraso-mobile-client/store';

jest.mock('terraso-client-shared/soilId/syncService');

const mockPushUserData = syncService.pushUserData as jest.MockedFunction<
  typeof syncService.pushUserData
>;

describe('pushUserData', () => {
  const mockGetState = jest.fn();
  const mockThunkAPI = {
    getState: mockGetState,
    dispatch: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty results when no site IDs provided', async () => {
    const mockState: Partial<AppState> = {
      soilData: {
        soilData: {},
        soilSync: {},
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    const results = await pushUserData({}, null, mockThunkAPI);

    expect(results).toEqual({});
    expect(mockPushUserData).not.toHaveBeenCalled();
  });

  it('should return empty results when site IDs have no unsynced changes', async () => {
    const mockState: Partial<AppState> = {
      soilData: {
        soilData: {
          'site-1': {
            depthIntervalPreset: 'CUSTOM',
            depthIntervals: [],
            depthDependentData: [],
          },
        },
        soilSync: {}, // No sync records means no unsynced changes
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {
          'site-1': {
            userRatings: [],
          },
        },
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    const results = await pushUserData(
      {
        soilDataSiteIds: ['site-1'],
        soilMetadataSiteIds: ['site-1'],
      },
      null,
      mockThunkAPI,
    );

    expect(results).toEqual({});
    expect(mockPushUserData).not.toHaveBeenCalled();
  });

  it('should push only soilData when only soilData has unsynced changes', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    await pushUserData({soilDataSiteIds: ['site-1']}, null, mockThunkAPI);

    expect(mockPushUserData).toHaveBeenCalledWith({
      soilDataEntries: expect.any(Array),
      soilMetadataEntries: null,
    });
  });

  it('should push only soilMetadata when only soilMetadata has unsynced changes', async () => {
    const soilMetadataSync: SyncRecords<
      SoilMetadata,
      SoilMetadataPushFailureReason
    > = {
      'site-1': {revisionId: 1},
    };
    const soilMetadata: Record<string, SoilMetadata> = {
      'site-1': {
        userRatings: [
          {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
        ],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData: {},
        soilSync: {},
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata,
        soilMetadataSync,
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: null,
      soilMetadataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilMetadataPushEntrySuccess',
            soilMetadata: {
              userRatings: [
                {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
              ],
            },
          },
        },
      ],
      clientMutationId: null,
    });

    await pushUserData({soilMetadataSiteIds: ['site-1']}, null, mockThunkAPI);

    expect(mockPushUserData).toHaveBeenCalledWith({
      soilDataEntries: null,
      soilMetadataEntries: expect.any(Array),
    });
  });

  it('should push both soilData and soilMetadata when both have unsynced changes', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };
    const soilMetadataSync: SyncRecords<
      SoilMetadata,
      SoilMetadataPushFailureReason
    > = {
      'site-1': {revisionId: 1},
    };
    const soilMetadata: Record<string, SoilMetadata> = {
      'site-1': {
        userRatings: [
          {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
        ],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata,
        soilMetadataSync,
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilMetadataPushEntrySuccess',
            soilMetadata: {
              userRatings: [
                {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
              ],
            },
          },
        },
      ],
      clientMutationId: null,
    });

    await pushUserData(
      {soilDataSiteIds: ['site-1'], soilMetadataSiteIds: ['site-1']},
      null,
      mockThunkAPI,
    );

    expect(mockPushUserData).toHaveBeenCalledWith({
      soilDataEntries: expect.any(Array),
      soilMetadataEntries: expect.any(Array),
    });
  });

  it('should handle partial failure (soilData success, soilMetadata failure)', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };
    const soilMetadataSync: SyncRecords<
      SoilMetadata,
      SoilMetadataPushFailureReason
    > = {
      'site-1': {revisionId: 1},
    };
    const soilMetadata: Record<string, SoilMetadata> = {
      'site-1': {
        userRatings: [
          {soilMatchId: 'match-1', rating: 'SELECTED' as UserMatchRating},
        ],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata,
        soilMetadataSync,
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilMetadataPushEntryFailure',
            reason: 'NOT_ALLOWED' as SoilMetadataPushFailureReason,
          },
        },
      ],
      clientMutationId: null,
    });

    const results = await pushUserData(
      {soilDataSiteIds: ['site-1'], soilMetadataSiteIds: ['site-1']},
      null,
      mockThunkAPI,
    );

    expect(results.soilDataResults!.data['site-1']).toBeDefined();
    expect(results.soilDataResults!.errors['site-1']).toBeUndefined();
    expect(results.soilMetadataResults!.errors['site-1']).toBeDefined();
    expect(results.soilMetadataResults!.errors['site-1'].value).toBe(
      'NOT_ALLOWED',
    );
    expect(results.soilMetadataResults!.data['site-1']).toBeUndefined();
  });

  it('should handle multiple sites for soilData', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
      'site-2': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      'site-2': {
        depthIntervalPreset: 'NRCS',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
        {
          siteId: 'site-2',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'NRCS',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-2']},
      null,
      mockThunkAPI,
    );

    expect(mockPushUserData).toHaveBeenCalledWith({
      soilDataEntries: expect.arrayContaining([
        expect.objectContaining({siteId: 'site-1'}),
        expect.objectContaining({siteId: 'site-2'}),
      ]),
      soilMetadataEntries: null,
    });
  });

  it('should only push sites that are in the provided site IDs list', async () => {
    // Tests that getEntityRecords filters to only the specified site IDs,
    // even when other sites have unsynced changes
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
      'site-2': {revisionId: 1},
      'site-3': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      'site-2': {
        depthIntervalPreset: 'NRCS',
        depthIntervals: [],
        depthDependentData: [],
      },
      'site-3': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
        {
          siteId: 'site-3',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-3']}, // Only site-1 and site-3
      null,
      mockThunkAPI,
    );

    // Verify only the specified site IDs are sent to the service (site-2 excluded)
    const callArgs = mockPushUserData.mock.calls[0][0];
    expect(callArgs.soilDataEntries).toHaveLength(2);
    expect(callArgs.soilDataEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({siteId: 'site-1'}),
        expect.objectContaining({siteId: 'site-3'}),
      ]),
    );
    expect(callArgs.soilMetadataEntries).toBeNull();
  });

  // --------------------

  it('should handle service errors by rejecting the promise', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    const networkError = new Error('Network request failed');
    mockPushUserData.mockRejectedValue(networkError);

    await expect(
      pushUserData({soilDataSiteIds: ['site-1']}, null, mockThunkAPI),
    ).rejects.toThrow('Network request failed');
  });

  it('should handle multiple sites with mixed success and failure for same data type', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
      'site-2': {revisionId: 1},
      'site-3': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      'site-2': {
        depthIntervalPreset: 'NRCS',
        depthIntervals: [],
        depthDependentData: [],
      },
      'site-3': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
        {
          siteId: 'site-2',
          result: {
            __typename: 'SoilDataPushEntryFailure',
            reason: 'NOT_ALLOWED' as SoilDataPushFailureReason,
          },
        },
        {
          siteId: 'site-3',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    const results = await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-2', 'site-3']},
      null,
      mockThunkAPI,
    );

    expect(results.soilDataResults!.data['site-1']).toBeDefined();
    expect(results.soilDataResults!.errors['site-1']).toBeUndefined();
    expect(results.soilDataResults!.data['site-2']).toBeUndefined();
    expect(results.soilDataResults!.errors['site-2']).toBeDefined();
    expect(results.soilDataResults!.errors['site-2'].value).toBe('NOT_ALLOWED');
    expect(results.soilDataResults!.data['site-3']).toBeDefined();
    expect(results.soilDataResults!.errors['site-3']).toBeUndefined();
  });

  it('should handle site with sync records but missing actual data', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
      'site-2': {revisionId: 1},
    };
    const soilData: Record<string, SoilData | undefined> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      // site-2 has sync record but no data
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-2']},
      null,
      mockThunkAPI,
    );

    // Should only push site-1 since site-2 has no data
    expect(mockPushUserData).toHaveBeenCalledWith({
      soilDataEntries: [expect.objectContaining({siteId: 'site-1'})],
      soilMetadataEntries: null,
    });
  });

  it('should handle empty response arrays differently than null', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    // Service returns empty array instead of null
    mockPushUserData.mockResolvedValue({
      soilDataResults: [],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    const results = await pushUserData(
      {soilDataSiteIds: ['site-1']},
      null,
      mockThunkAPI,
    );

    expect(results.soilDataResults).toBeDefined();
    expect(Object.keys(results.soilDataResults!.data)).toHaveLength(0);
    expect(Object.keys(results.soilDataResults!.errors)).toHaveLength(0);
  });

  it('should skip pushing when site IDs exist but have no revision ID', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {}, // No revisionId means not modified/unsynced
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    const results = await pushUserData(
      {soilDataSiteIds: ['site-1']},
      null,
      mockThunkAPI,
    );

    expect(results).toEqual({});
    expect(mockPushUserData).not.toHaveBeenCalled();
  });

  it('should skip pushing when site IDs are provided but already synced', async () => {
    // Tests defensive filtering: site IDs may have been unsynced when selected by
    // the dispatcher, but synced by another process before pushUserData executes
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1, lastSyncedRevisionId: 1}, // Already synced
      'site-2': {revisionId: 2, lastSyncedRevisionId: 2}, // Already synced
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      'site-2': {
        depthIntervalPreset: 'NRCS',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    const results = await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-2']},
      null,
      mockThunkAPI,
    );

    expect(results).toEqual({});
    expect(mockPushUserData).not.toHaveBeenCalled();
  });

  it('should handle duplicate site IDs in input arrays', async () => {
    const soilSync: SyncRecords<SoilData, SoilDataPushFailureReason> = {
      'site-1': {revisionId: 1},
    };
    const soilData: Record<string, SoilData> = {
      'site-1': {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const mockState: Partial<AppState> = {
      soilData: {
        soilData,
        soilSync,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {},
        soilMetadataSync: {},
      },
    };
    mockGetState.mockReturnValue(mockState);

    mockPushUserData.mockResolvedValue({
      soilDataResults: [
        {
          siteId: 'site-1',
          result: {
            __typename: 'SoilDataPushEntrySuccess',
            soilData: {
              depthIntervalPreset: 'CUSTOM',
              depthIntervals: [],
              depthDependentData: [],
            } as any,
          },
        },
      ],
      soilMetadataResults: null,
      clientMutationId: null,
    });

    await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-1', 'site-1']}, // Duplicates
      null,
      mockThunkAPI,
    );

    // Should only send one entry despite duplicates
    const callArgs = mockPushUserData.mock.calls[0][0];
    expect(callArgs.soilDataEntries).toHaveLength(1);
  });
});
