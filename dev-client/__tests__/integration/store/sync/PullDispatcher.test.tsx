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
import {LoadingState} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AppState as ReduxAppState} from 'terraso-mobile-client/store';
import * as syncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {PullDispatcher} from 'terraso-mobile-client/store/sync/PullDispatcher';

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => {
  return {
    ...jest.requireActual('terraso-mobile-client/hooks/connectivityHooks'),
    useIsOffline: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/hooks/appStateHooks', () => {
  return {
    ...jest.requireActual('terraso-mobile-client/hooks/appStateHooks'),
    useAppState: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
  return {
    ...jest.requireActual('terraso-mobile-client/store/sync/hooks/syncHooks'),
    usePullDispatch: jest.fn(),
  };
});

describe('PullDispatcher', () => {
  const useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);
  const useAppStateMock = jest.mocked(appStateHooks.useAppState);
  const usePullDispatchMock = jest.mocked(syncHooks.usePullDispatch);
  const dispatchPull = jest.fn();

  const stateWithPullRequested = {
    sync: {
      pullRequested: true,
    },
  };

  const stateWithLoggedInUser = {
    account: {
      currentUser: {data: {id: 'userid1'}},
    },
  } as Partial<ReduxAppState>;

  const stateWithUnsyncedSites = {
    soilData: {
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
    dispatchPull.mockReset();
    usePullDispatchMock.mockReset();
    usePullDispatchMock.mockReturnValue(dispatchPull);
    usePullDispatchMock.mockClear();
  });

  test('dispatches pull when all conditions are right', () => {
    render(<PullDispatcher />, {
      initialState: {...stateWithLoggedInUser, ...stateWithPullRequested},
    });
    expect(dispatchPull).toHaveBeenCalled();
  });

  // test('OLD - dispatches pull when all conditions are right', () => {
  //   renderTestComponents(stateWithLoggedInUser);
  //   expect(dispatchPull).toHaveBeenCalled();
  // });

  test('does not dispatch pull when no logged in user', () => {
    // Don't use stateWithLoggedInUser
    render(<PullDispatcher />, {initialState: stateWithPullRequested});
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when offline', () => {
    useIsOfflineMock.mockReturnValue(true);
    render(<PullDispatcher />, {
      initialState: {...stateWithLoggedInUser, ...stateWithPullRequested},
    });
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when there are unsynced site ids yet to push', () => {
    render(<PullDispatcher />, {
      initialState: {
        ...stateWithLoggedInUser,
        ...stateWithPullRequested,
        ...stateWithUnsyncedSites,
      },
    });
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when app is not in foreground', () => {
    useAppStateMock.mockReturnValue('background');
    render(<PullDispatcher />, {
      initialState: {...stateWithLoggedInUser, ...stateWithPullRequested},
    });
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when pull is not requested', () => {
    render(<PullDispatcher />, {
      initialState: {...stateWithLoggedInUser},
    });
    expect(dispatchPull).not.toHaveBeenCalled();
  });
});
