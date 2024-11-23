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
import {LoadingState} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {AppState as ReduxAppState} from 'terraso-mobile-client/store';
import * as syncContext from 'terraso-mobile-client/store/sync/hooks/SyncContext';
import * as syncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {PullDispatcher} from 'terraso-mobile-client/store/sync/PullDispatcher';

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => {
  return {
    useIsOffline: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/hooks/appStateHooks', () => {
  return {
    useAppState: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
  const actual = jest.requireActual(
    'terraso-mobile-client/store/sync/hooks/syncHooks',
  );
  return {
    ...actual,
    usePullDispatch: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/store/sync/hooks/SyncContext', () => {
  const actual = jest.requireActual(
    'terraso-mobile-client/store/sync/hooks/SyncContext',
  );
  return {
    ...actual,
    usePullRequested: jest.fn(),
  };
});

const renderTestComponents = (initialState?: Partial<ReduxAppState>) => {
  return render(
    <syncContext.PullContextProvider>
      <PullDispatcher />
    </syncContext.PullContextProvider>,
    {initialState: initialState},
  );
};

describe('PullDispatcher', () => {
  // TODO-cknipe: Make const?
  let useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);
  let useAppStateMock = jest.mocked(appStateHooks.useAppState);
  let usePullRequestedMock = jest.mocked(syncContext.usePullRequested);

  let usePullDispatchMock = jest.mocked(syncHooks.usePullDispatch);
  let dispatchPull = jest.fn();

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
    usePullRequestedMock.mockReset().mockReturnValue({
      pullRequested: true,
      setPullRequested: () => {},
    } as syncContext.PullRequestedState);

    dispatchPull.mockReset();
    usePullDispatchMock.mockReset();
    usePullDispatchMock.mockReturnValue(dispatchPull);
    usePullDispatchMock.mockClear();
  });

  test('dispatches pull when all conditions are right', () => {
    renderTestComponents(stateWithLoggedInUser);
    expect(dispatchPull).toHaveBeenCalled();
  });

  test('does not dispatch pull when no logged in user', () => {
    // Don't use stateWithLoggedInUser
    renderTestComponents();
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when offline', () => {
    useIsOfflineMock.mockReturnValue(true);
    renderTestComponents(stateWithLoggedInUser);
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when there are unsynced site ids yet to push', () => {
    renderTestComponents({...stateWithLoggedInUser, ...stateWithUnsyncedSites});
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when app is not in foreground', () => {
    useAppStateMock.mockReturnValue('background');
    renderTestComponents(stateWithLoggedInUser);
    expect(dispatchPull).not.toHaveBeenCalled();
  });

  test('does not dispatch pull when pull is not requested', () => {
    usePullRequestedMock.mockReturnValue({
      pullRequested: false,
      setPullRequested: () => {},
    } as syncContext.PullRequestedState);
    renderTestComponents(stateWithLoggedInUser);
    expect(dispatchPull).not.toHaveBeenCalled();
  });
});
