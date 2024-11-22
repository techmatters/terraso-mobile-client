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

const renderTestComponents = (initialState?: Partial<ReduxAppState>) => {
  return render(
    <PullContextProvider>
      <PullDispatcher />
    </PullContextProvider>,
    {initialState: initialState},
  );
};

describe('PullDispatcher', () => {
  const useIsOfflineMock = jest.spyOn(connectivityHooks, 'useIsOffline');
  const useAppStateMock = jest.spyOn(appStateHooks, 'useAppState');
  const usePullRequestedMock = jest.spyOn(syncContext, 'usePullRequested');
  const fetchSoilDataForUserMock = jest.spyOn(
    globalSoilId,
    'fetchSoilDataForUser',
  );

  const stateWithLoggedInUser = {
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
    useIsOfflineMock.mockReset().mockReturnValue(false);
    useAppStateMock.mockReset().mockReturnValue('active');
    usePullRequestedMock
      .mockReset()
      .mockReturnValue({pullRequested: true, setPullRequested: () => {}});
    fetchSoilDataForUserMock.mockClear();
  });

  test('dispatches pull when all conditions are right', () => {
    renderTestComponents(stateWithLoggedInUser);
    expect(fetchSoilDataForUserMock).toHaveBeenCalled();
  });

  test('does not dispatch pull when no logged in user', () => {
    // Don't use stateWithLoggedInUser
    renderTestComponents();
    expect(fetchSoilDataForUserMock).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when offline', () => {
    useIsOfflineMock.mockReset().mockReturnValue(true);
    renderTestComponents(stateWithLoggedInUser);
    expect(fetchSoilDataForUserMock).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when there are unsynced site ids yet to push', () => {
    renderTestComponents({...stateWithLoggedInUser, ...stateWithUnsyncedSites});
    expect(fetchSoilDataForUserMock).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when app is not in foreground', () => {
    useAppStateMock.mockReset().mockReturnValue('background');
    renderTestComponents(stateWithLoggedInUser);
    expect(fetchSoilDataForUserMock).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when pull is not requested', () => {
    usePullRequestedMock
      .mockReset()
      .mockReturnValue({pullRequested: false, setPullRequested: () => {}});
    renderTestComponents(stateWithLoggedInUser);
    expect(fetchSoilDataForUserMock).not.toHaveBeenCalled();
  });
});
