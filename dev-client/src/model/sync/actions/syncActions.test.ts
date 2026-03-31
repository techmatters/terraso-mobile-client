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

import type {UserMatchRating} from 'terraso-client-shared/graphqlSchema/graphql';
import type {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';

import * as elevationService from 'terraso-mobile-client/model/elevation/elevationService';
import * as pushNoteModule from 'terraso-mobile-client/model/site/actions/pushNoteActions';
import * as pushSiteModule from 'terraso-mobile-client/model/site/actions/pushSiteActions';
import * as pushSoilDataModule from 'terraso-mobile-client/model/soilData/actions/pushSoilDataActions';
import * as pushSoilMetadataModule from 'terraso-mobile-client/model/soilMetadata/pushSoilMetadataActions';
import {pushUserData} from 'terraso-mobile-client/model/sync/actions/syncActions';
import type {SyncRecords} from 'terraso-mobile-client/model/sync/records';
import type {AppState} from 'terraso-mobile-client/store';

jest.mock('terraso-mobile-client/config', () => ({syncDebugEnabled: false}));
jest.mock('terraso-mobile-client/model/elevation/elevationService');
jest.mock('terraso-mobile-client/model/site/actions/pushSiteActions');
jest.mock('terraso-mobile-client/model/site/actions/pushNoteActions');
jest.mock('terraso-mobile-client/model/soilData/actions/pushSoilDataActions');
jest.mock('terraso-mobile-client/model/soilMetadata/pushSoilMetadataActions');
jest.mock('terraso-mobile-client/model/site/siteSlice', () => ({
  setSiteElevation: (payload: {siteId: string; elevation: number}) => ({
    type: 'site/setSiteElevation',
    payload,
  }),
}));

const mockPushSite = pushSiteModule.pushSite as jest.MockedFunction<
  typeof pushSiteModule.pushSite
>;
const mockPushNote = pushNoteModule.pushNote as jest.MockedFunction<
  typeof pushNoteModule.pushNote
>;
const mockPushSoilData =
  pushSoilDataModule.pushSoilDataForSite as jest.MockedFunction<
    typeof pushSoilDataModule.pushSoilDataForSite
  >;
const mockPushSoilMetadata =
  pushSoilMetadataModule.pushSoilMetadataForSite as jest.MockedFunction<
    typeof pushSoilMetadataModule.pushSoilMetadataForSite
  >;
const mockFetchElevation =
  elevationService.fetchElevationForCoords as jest.MockedFunction<
    typeof elevationService.fetchElevationForCoords
  >;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSite = (id: string, overrides?: Partial<Site>): Site => ({
  id,
  name: `Site ${id}`,
  latitude: 10,
  longitude: 20,
  elevation: null,
  privacy: 'PRIVATE',
  archived: false,
  updatedAt: '2024-01-01T00:00:00Z',
  notes: {},
  ...overrides,
});

const makeNote = (id: string, siteId: string): SiteNote => ({
  id,
  siteId,
  content: `Note ${id}`,
  authorId: 'user-1',
  authorFirstName: 'Alice',
  authorLastName: 'Smith',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

const makeSoilData = (preset = 'CUSTOM'): SoilData =>
  ({
    depthIntervalPreset: preset,
    depthIntervals: [],
    depthDependentData: [],
  }) as SoilData;

const makeMetadata = (
  ratings: Array<{soilMatchId: string; rating: UserMatchRating}> = [],
): SoilMetadata => ({userRatings: ratings});

const mockThunkAPI = (state: Partial<AppState>) => ({
  getState: jest.fn().mockReturnValue(state),
  dispatch: jest.fn(),
});

const baseState = (overrides?: Partial<AppState>): Partial<AppState> => ({
  site: {sites: {}, siteSync: {}, noteSync: {}},
  soilData: {soilData: {}, soilSync: {}, projectSettings: {}, status: 'ready'},
  soilMetadata: {soilMetadata: {}, soilMetadataSync: {}},
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pushUserData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchElevation.mockResolvedValue(42);
  });

  // ---- Empty / no-op cases ----

  it('returns empty results when no IDs provided', async () => {
    const api = mockThunkAPI(baseState());
    const results = await pushUserData({}, null, api as any);
    expect(results).toEqual({});
  });

  it('returns empty results when IDs have no unsynced changes', async () => {
    const state = baseState({
      soilData: {
        soilData: {'site-1': makeSoilData()},
        soilSync: {},
        projectSettings: {},
        status: 'ready',
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {soilDataSiteIds: ['site-1']},
      null,
      api as any,
    );
    expect(results).toEqual({});
    expect(mockPushSoilData).not.toHaveBeenCalled();
  });

  it('skips already-synced records', async () => {
    const state = baseState({
      soilData: {
        soilData: {'site-1': makeSoilData()},
        soilSync: {'site-1': {revisionId: 1, lastSyncedRevisionId: 1}},
        projectSettings: {},
        status: 'ready',
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {soilDataSiteIds: ['site-1']},
      null,
      api as any,
    );
    expect(results).toEqual({});
  });

  // ---- Site push ----

  it('pushes unsynced sites via pushSite', async () => {
    const site = makeSite('site-1', {elevation: 100});
    const serverSite = {...site, elevation: 100};
    mockPushSite.mockResolvedValue(serverSite);

    const state = baseState({
      site: {
        sites: {'site-1': site},
        siteSync: {'site-1': {revisionId: 1}} as SyncRecords<Site, string>,
        noteSync: {},
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {siteSiteIds: ['site-1']},
      null,
      api as any,
    );

    expect(mockPushSite).toHaveBeenCalledTimes(1);
    expect(results.siteResults!.data['site-1'].value).toBe(serverSite);
  });

  it('fetches elevation for sites with null elevation', async () => {
    const site = makeSite('site-1'); // elevation = null
    mockPushSite.mockResolvedValue({...site, elevation: 42});

    const state = baseState({
      site: {
        sites: {'site-1': site},
        siteSync: {'site-1': {revisionId: 1}} as SyncRecords<Site, string>,
        noteSync: {},
      },
    });
    const api = mockThunkAPI(state);
    await pushUserData({siteSiteIds: ['site-1']}, null, api as any);

    expect(mockFetchElevation).toHaveBeenCalledWith(10, 20);
    expect(api.dispatch).toHaveBeenCalledWith({
      type: 'site/setSiteElevation',
      payload: {siteId: 'site-1', elevation: 42},
    });
  });

  it('does not fetch elevation when site already has it', async () => {
    const site = makeSite('site-1', {elevation: 100});
    mockPushSite.mockResolvedValue(site);

    const state = baseState({
      site: {
        sites: {'site-1': site},
        siteSync: {'site-1': {revisionId: 1}} as SyncRecords<Site, string>,
        noteSync: {},
      },
    });
    const api = mockThunkAPI(state);
    await pushUserData({siteSiteIds: ['site-1']}, null, api as any);

    expect(mockFetchElevation).not.toHaveBeenCalled();
  });

  // ---- Note push ----

  it('pushes unsynced notes via pushNote', async () => {
    const note = makeNote('note-1', 'site-1');
    const site = makeSite('site-1', {notes: {'note-1': note}});
    mockPushNote.mockResolvedValue(note);

    const state = baseState({
      site: {
        sites: {'site-1': site},
        siteSync: {},
        noteSync: {
          'note-1': {revisionId: 1},
        } as SyncRecords<SiteNote, string>,
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData({noteIds: ['note-1']}, null, api as any);

    expect(mockPushNote).toHaveBeenCalledTimes(1);
    expect(results.noteResults!.data['note-1'].value).toBe(note);
  });

  // ---- Soil data push ----

  it('pushes unsynced soil data via pushSoilDataForSite', async () => {
    const data = makeSoilData();
    mockPushSoilData.mockResolvedValue(data);

    const state = baseState({
      soilData: {
        soilData: {'site-1': data},
        soilSync: {'site-1': {revisionId: 1}} as SyncRecords<SoilData, string>,
        projectSettings: {},
        status: 'ready',
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {soilDataSiteIds: ['site-1']},
      null,
      api as any,
    );

    expect(mockPushSoilData).toHaveBeenCalledTimes(1);
    expect(results.soilDataResults!.data['site-1'].value).toBe(data);
  });

  // ---- Soil metadata push ----

  it('pushes unsynced soil metadata via pushSoilMetadataForSite', async () => {
    const meta = makeMetadata([{soilMatchId: 'match-1', rating: 'SELECTED'}]);
    mockPushSoilMetadata.mockResolvedValue(meta);

    const state = baseState({
      soilMetadata: {
        soilMetadata: {'site-1': meta},
        soilMetadataSync: {'site-1': {revisionId: 1}} as SyncRecords<
          SoilMetadata,
          string
        >,
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {soilMetadataSiteIds: ['site-1']},
      null,
      api as any,
    );

    expect(mockPushSoilMetadata).toHaveBeenCalledTimes(1);
    expect(results.soilMetadataResults!.data['site-1'].value).toBe(meta);
  });

  // ---- Combined push ----

  it('pushes all entity types in one call', async () => {
    const site = makeSite('site-1', {
      elevation: 100,
      notes: {'note-1': makeNote('note-1', 'site-1')},
    });
    const soilData = makeSoilData();
    const meta = makeMetadata([{soilMatchId: 'match-1', rating: 'SELECTED'}]);

    mockPushSite.mockResolvedValue(site);
    mockPushNote.mockResolvedValue(makeNote('note-1', 'site-1'));
    mockPushSoilData.mockResolvedValue(soilData);
    mockPushSoilMetadata.mockResolvedValue(meta);

    const state = baseState({
      site: {
        sites: {'site-1': site},
        siteSync: {'site-1': {revisionId: 1}} as SyncRecords<Site, string>,
        noteSync: {'note-1': {revisionId: 1}} as SyncRecords<SiteNote, string>,
      },
      soilData: {
        soilData: {'site-1': soilData},
        soilSync: {'site-1': {revisionId: 1}} as SyncRecords<SoilData, string>,
        projectSettings: {},
        status: 'ready',
      },
      soilMetadata: {
        soilMetadata: {'site-1': meta},
        soilMetadataSync: {'site-1': {revisionId: 1}} as SyncRecords<
          SoilMetadata,
          string
        >,
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {
        siteSiteIds: ['site-1'],
        noteIds: ['note-1'],
        soilDataSiteIds: ['site-1'],
        soilMetadataSiteIds: ['site-1'],
      },
      null,
      api as any,
    );

    expect(results.siteResults).toBeDefined();
    expect(results.noteResults).toBeDefined();
    expect(results.soilDataResults).toBeDefined();
    expect(results.soilMetadataResults).toBeDefined();
  });

  // ---- Error handling ----

  it('records per-entity errors without aborting the push', async () => {
    const data1 = makeSoilData();
    const data2 = makeSoilData('NRCS');

    mockPushSoilData
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(data2);

    const state = baseState({
      soilData: {
        soilData: {'site-1': data1, 'site-2': data2},
        soilSync: {
          'site-1': {revisionId: 1},
          'site-2': {revisionId: 1},
        } as SyncRecords<SoilData, string>,
        projectSettings: {},
        status: 'ready',
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {soilDataSiteIds: ['site-1', 'site-2']},
      null,
      api as any,
    );

    expect(results.soilDataResults!.errors['site-1']).toBeDefined();
    expect(results.soilDataResults!.data['site-2']).toBeDefined();
  });

  it('rethrows network errors to abort the entire push', async () => {
    const networkError = ['terraso_api.error_request_response'];
    mockPushSoilData.mockRejectedValue(networkError);

    const state = baseState({
      soilData: {
        soilData: {'site-1': makeSoilData()},
        soilSync: {'site-1': {revisionId: 1}} as SyncRecords<SoilData, string>,
        projectSettings: {},
        status: 'ready',
      },
    });
    const api = mockThunkAPI(state);

    await expect(
      pushUserData({soilDataSiteIds: ['site-1']}, null, api as any),
    ).rejects.toEqual(networkError);
  });

  // ---- Multiple sites ----

  it('pushes multiple sites', async () => {
    const site1 = makeSite('site-1', {elevation: 100});
    const site2 = makeSite('site-2', {elevation: 200});
    mockPushSite.mockResolvedValueOnce(site1).mockResolvedValueOnce(site2);

    const state = baseState({
      site: {
        sites: {'site-1': site1, 'site-2': site2},
        siteSync: {
          'site-1': {revisionId: 1},
          'site-2': {revisionId: 1},
        } as SyncRecords<Site, string>,
        noteSync: {},
      },
    });
    const api = mockThunkAPI(state);
    const results = await pushUserData(
      {siteSiteIds: ['site-1', 'site-2']},
      null,
      api as any,
    );

    expect(mockPushSite).toHaveBeenCalledTimes(2);
    expect(results.siteResults!.data['site-1']).toBeDefined();
    expect(results.siteResults!.data['site-2']).toBeDefined();
  });
});
