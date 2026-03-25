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

import {waitFor} from '@testing-library/react-native';
import {render} from '@testing/integration/utils';

import * as siteService from 'terraso-client-shared/site/siteService';
import type {Site} from 'terraso-client-shared/site/siteTypes';

import * as elevationService from 'terraso-mobile-client/model/elevation/elevationService';
import {pullUserData} from 'terraso-mobile-client/model/sync/syncGlobalReducer';
import {createStore} from 'terraso-mobile-client/store';
import {PushDispatcher} from 'terraso-mobile-client/store/sync/PushDispatcher';

const SITE_ID = 'site-1';
const FETCHED_ELEVATION = 42;

const mockFetchElevationForCoords = jest.fn();
const mockUpdateSite = jest.fn();
const mockFetchSite = jest.fn();

// Mock useIsOffline to return false (online) so that useDebouncedIsOffline starts with false on first render. In the Node.js test environment, use-debounce does not schedule timers (it checks for window), so the debounced value is stuck at the initial value. By making useIsOffline() return false from the start, the debounced value initializes to false and needsPush becomes true immediately.
jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => ({
  ...jest.requireActual('terraso-mobile-client/hooks/connectivityHooks'),
  useIsOffline: jest.fn().mockReturnValue(false),
}));

jest.mock('terraso-mobile-client/model/elevation/elevationService', () => ({
  fetchElevationForCoords: (
    ...args: Parameters<typeof elevationService.fetchElevationForCoords>
  ) => mockFetchElevationForCoords(...args),
  getElevation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('terraso-client-shared/site/siteService', () => ({
  ...jest.requireActual('terraso-client-shared/site/siteService'),
  updateSite: (...args: Parameters<typeof siteService.updateSite>) =>
    mockUpdateSite(...args),
  fetchSite: (...args: Parameters<typeof siteService.fetchSite>) =>
    mockFetchSite(...args),
}));

const pulledSite: Site = {
  id: SITE_ID,
  name: 'Test Site',
  latitude: 10,
  longitude: 20,
  elevation: null,
  privacy: 'PRIVATE',
  archived: false,
  updatedAt: '2024-01-01T00:00:00Z',
  notes: {},
};

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

describe('PushDispatcher: elevation fetched and pushed after pull with missing elevation', () => {
  beforeEach(() => {
    mockFetchElevationForCoords.mockReset();
    mockUpdateSite.mockReset();
    mockFetchSite.mockReset();

    mockFetchElevationForCoords.mockResolvedValue(FETCHED_ELEVATION);
    mockUpdateSite.mockResolvedValue(undefined);
    mockFetchSite.mockResolvedValue({
      ...pulledSite,
      elevation: FETCHED_ELEVATION,
    });
  });

  test('fetches elevation and calls updateSite after pull with missing elevation', async () => {
    // 1. Build post-pull state using a setup store
    const setupStore = createStore({
      account: {
        currentUser: {
          data: {
            id: 'user-1',
            email: 'user@example.com',
            firstName: 'Test',
            lastName: 'User',
            profileImage: '',
            preferences: {},
          },
          fetching: false,
        },
        users: {},
      } as any,
    });

    setupStore.dispatch(
      pullUserData.fulfilled(
        makePullPayload({[SITE_ID]: pulledSite}),
        'requestId',
        'user-1',
      ),
    );

    // 2. Render PushDispatcher with the post-pull state.
    // Since useIsOffline is mocked to return false immediately, useDebouncedIsOffline
    // also starts as false (the initial value is debounced synchronously), so
    // needsPush = true on the first render and the push dispatches right away.
    render(<PushDispatcher />, {initialState: setupStore.getState()});

    // 3. Wait for both fetchElevationForCoords AND updateSite to have been called.
    // waitFor advances fake timers internally (50ms per interval) to drive the
    // push thunk through its async steps.
    await waitFor(
      () => {
        expect(mockFetchElevationForCoords).toHaveBeenCalledWith(
          pulledSite.latitude,
          pulledSite.longitude,
        );
        expect(mockUpdateSite).toHaveBeenCalledWith(
          expect.objectContaining({id: SITE_ID, elevation: FETCHED_ELEVATION}),
        );
      },
      {timeout: 5000},
    );
  });
});
