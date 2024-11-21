/*
 * Copyright © 2024 Technology Matters
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

import {render} from '@testing/integration/utils';

import {SoilIdSoilDataDepthIntervalPresetChoices} from 'terraso-client-shared/graphqlSchema/graphql';

import * as appStateHooks from 'terraso-mobile-client/hooks/appStateHooks';
import * as connectivityHooks from 'terraso-mobile-client/hooks/connectivityHooks';
import * as globalSoilId from 'terraso-mobile-client/model/soilId/soilIdGlobalReducer';
import {LoadingState} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {AppState as ReduxAppState} from 'terraso-mobile-client/store';
import {PullContextProvider} from 'terraso-mobile-client/store/sync/hooks/SyncContext';
import * as syncContext from 'terraso-mobile-client/store/sync/hooks/SyncContext';
import {PullDispatcher} from 'terraso-mobile-client/store/sync/PullDispatcher';

// jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
//   return {
//     useDebouncedIsOffline: jest.fn(),
//     useIsLoggedIn: jest.fn(),
// };
// });
// fetchSoilDataForUser: jest.fn();

const renderTestComponents = (initialState?: Partial<ReduxAppState>) => {
  return render(
    <PullContextProvider>
      <PullDispatcher />
    </PullContextProvider>,
    {initialState: initialState},
  );
};

describe('PullDispatcher', () => {
  const useIsOfflineSpy = jest.spyOn(connectivityHooks, 'useIsOffline');
  const useAppStateSpy = jest.spyOn(appStateHooks, 'useAppState');
  const usePullRequested = jest.spyOn(syncContext, 'usePullRequested');

  // TODO-cknipe: Use mock instead of spy
  const fetchSoilDataForUserSpy = jest.spyOn(
    globalSoilId,
    'fetchSoilDataForUser',
  );

  // Simulates user being logged in
  const stateWithUser = {
    account: {
      currentUser: {data: {id: 'userid1'}},
    },
  } as Partial<ReduxAppState>;

  const stateWithUnsyncedSites = {
    soilId: {
      soilData: {},
      projectSettings: {},
      status: 'ready' as LoadingState,
      matches: {},
      soilSync: {
        site: {
          lastSyncedData: {
            bedrock: null,
            crossSlope: null,
            depthDependentData: [],
            depthIntervalPreset:
              'NRCS' as SoilIdSoilDataDepthIntervalPresetChoices,
            depthIntervals: [],
            downSlope: null,
            floodingSelect: null,
            grazingSelect: null,
            landCoverSelect: null,
            limeRequirementsSelect: null,
            slopeAspect: null,
            slopeLandscapePosition: null,
            slopeSteepnessDegree: null,
            slopeSteepnessPercent: null,
            slopeSteepnessSelect: null,
            soilDepthSelect: null,
            surfaceCracksSelect: null,
            surfaceSaltSelect: null,
            surfaceStoninessSelect: null,
            waterTableDepthSelect: null,
          },
          lastSyncedError: undefined,
          lastSyncedRevisionId: 1,
          revisionId: 2,
        },
      },
    },
  } as Partial<ReduxAppState>;

  beforeEach(() => {
    //useIsLoggedInSpy.mockReset().mockReturnValue(true);
    useIsOfflineSpy.mockReset().mockReturnValue(false);
    useAppStateSpy.mockReset().mockReturnValue('active');
    usePullRequested
      .mockReset()
      .mockReturnValue({pullRequested: true, setPullRequested: () => {}});
    fetchSoilDataForUserSpy.mockClear();
  });
  test('dispatches pull when all conditions are right', () => {
    renderTestComponents(stateWithUser);
    expect(fetchSoilDataForUserSpy).toHaveBeenCalled();
  });

  test('does not dispatch pull when no logged in user', () => {
    // Don't use stateWithUser
    renderTestComponents();
    expect(fetchSoilDataForUserSpy).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when offline', () => {
    useIsOfflineSpy.mockReset().mockReturnValue(true);
    renderTestComponents(stateWithUser);
    expect(fetchSoilDataForUserSpy).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when there are unsynced site ids yet to push', () => {
    renderTestComponents({...stateWithUser, ...stateWithUnsyncedSites});
    expect(fetchSoilDataForUserSpy).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when app is not in foreground', () => {
    useAppStateSpy.mockReset().mockReturnValue('background');
    renderTestComponents(stateWithUser);
    expect(fetchSoilDataForUserSpy).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when pull is not requested', () => {
    usePullRequested
      .mockReset()
      .mockReturnValue({pullRequested: false, setPullRequested: () => {}});
    renderTestComponents(stateWithUser);
    expect(fetchSoilDataForUserSpy).not.toHaveBeenCalled();
  });
});
