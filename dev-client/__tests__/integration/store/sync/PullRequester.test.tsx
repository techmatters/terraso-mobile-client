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

import {useEffect} from 'react';

import {render} from '@testing/integration/utils';

import {AppState} from 'terraso-mobile-client/store';
import {
  PullContextProvider,
  usePullRequested,
} from 'terraso-mobile-client/store/sync/hooks/SyncContext';
import * as syncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {
  PULL_INTERVAL_MS,
  PullRequester,
} from 'terraso-mobile-client/store/sync/PullRequester';

// Allows test to inspect the state with: screen.getByTestId('pullRequestedState')
// and set the state with: fireEvent.press(screen.getByText('setPullRequestedFalse'))
type Props = {
  mock: ReturnType<typeof jest.fn>;
  newPullRequested?: boolean;
};

// The mock exists so we can test against what it was called with,
// so we can access the value of pullRequested
const ExposePullRequestedForTest = ({mock, newPullRequested}: Props) => {
  const {pullRequested, setPullRequested} = usePullRequested();
  useEffect(() => {
    console.log('Doing mock to pullRequested which is', pullRequested);
    mock(pullRequested);
  }, [pullRequested, mock]);

  useEffect(() => {
    if (newPullRequested !== undefined) {
      console.log('useEffect for newPullRequested:', newPullRequested);
      setPullRequested(newPullRequested);
    }
  }, [newPullRequested, setPullRequested]);
  return <></>;
};

type RenderedScreen = ReturnType<typeof render>;

const renderTestComponents = (initialState?: Partial<AppState>) => {
  const mock = jest.fn();
  const screen = render(
    <PullContextProvider>
      <PullRequester />
      <ExposePullRequestedForTest mock={mock} />
    </PullContextProvider>,
    {initialState: initialState},
  );
  return {screen, mock};
};

const setPullRequestedFalse = (screen: RenderedScreen) => {
  screen.rerender(
    <PullContextProvider>
      <PullRequester />
      <ExposePullRequestedForTest mock={jest.fn()} newPullRequested={false} />
    </PullContextProvider>,
  );
};

const rerenderTestComponents = (
  screen: RenderedScreen,
  newPullRequested?: boolean,
) => {
  const mock = jest.fn();
  screen.rerender(
    <PullContextProvider>
      <PullRequester />
      <ExposePullRequestedForTest
        mock={mock}
        newPullRequested={newPullRequested}
      />
    </PullContextProvider>,
  );
  return {mock};
};

describe('PullRequester', () => {
  test('requests pull on first mount', () => {
    const {mock} = renderTestComponents();
    expect(mock).toHaveBeenLastCalledWith(true);
  });

  test('does not request pull immediately after pull is set to false', () => {
    const {screen} = renderTestComponents();
    // This and all following tests should do this after first render
    // because (as test above shows) first render will always set it to true
    setPullRequestedFalse(screen);
    const {mock} = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});

describe('PullRequester + isOffline', () => {
  const offlineSpy = jest.spyOn(syncHooks, 'useDebouncedIsOffline');
  beforeEach(() => {
    offlineSpy.mockClear();
  });
  test('requests pull when coming online from offline', () => {
    offlineSpy.mockClear().mockReturnValue(true);
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    offlineSpy.mockClear().mockReturnValue(false);
    const {mock} = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(true);
  });

  test('does not request pull when going offline from online', () => {
    offlineSpy.mockClear().mockReturnValue(false);
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    offlineSpy.mockClear().mockReturnValue(true);
    const {mock} = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });

  test('does not request pull when consistently online', () => {
    offlineSpy.mockClear().mockReturnValue(false);
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    const {mock} = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});

// TODO-cknipe: Figure this out

// const exampleSoilSyncEntry = {
//   lastSyncedData: {
//     bedrock: null,
//     crossSlope: null,
//     depthDependentData: [],
//     depthIntervalPreset: 'NRCS' as SoilIdSoilDataDepthIntervalPresetChoices,
//     depthIntervals: [],
//     downSlope: null,
//     floodingSelect: null,
//     grazingSelect: null,
//     landCoverSelect: null,
//     limeRequirementsSelect: null,
//     slopeAspect: null,
//     slopeLandscapePosition: null,
//     slopeSteepnessDegree: null,
//     slopeSteepnessPercent: null,
//     slopeSteepnessSelect: null,
//     soilDepthSelect: null,
//     surfaceCracksSelect: null,
//     surfaceSaltSelect: null,
//     surfaceStoninessSelect: null,
//     waterTableDepthSelect: null,
//   },
//   lastSyncedError: undefined,
//   lastSyncedRevisionId: 1,
//   revisionId: 1,
// };

// describe('PullRequester + sitesWithErrors', () => {
//   test('requests pull when site has error', () => {
//     // TODO-cknipe: Confirm that the errors in soilId slice will go away after an actual pull
//     const createTestState = () => {
//       return {
//         soilId: {
//           soilData: {},
//           projectSettings: {},
//           status: 'ready' as LoadingState,
//           matches: {},
//           soilSync: {
//             site: exampleSoilSyncEntry,
//           },
//         },
//       } as Partial<AppState>;
//     };
//     const screen = renderTestComponents(createTestState());
//     setPullRequestedFalse(screen);
//     const updatedTestState = createTestState();
//     updatedTestState.soilId!.soilSync.site.lastSyncedError =
//       'NOT_ALLOWED' as SoilDataPushFailureReason;
//     // TODO-cknipe: How to properly update the redux state so the selector will trigger?
//     // - Create a redux action in prod to dispatch in test? Seems sketch
//     // - Figure out how to dispatch redux actions in a test &
//     //   mock whatever happens in the push dispatch to return new soilSync data
//     //   Uhhhh dunno how to useDispatch tho: dispatch(pushSoilData(["site"]))
//     // - ???????
//     rerenderTestComponents(screen);
//     expect(getPullRequestedText(screen)).toHaveTextContent('true');
//   });
// });

describe('PullRequester + interval', () => {
  jest.useFakeTimers();
  test('requests pull after specified amount of time', () => {
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    jest.advanceTimersByTime(PULL_INTERVAL_MS + 1);
    const {mock} = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(true);
  });
  test('does not request pull before specified amount of time', () => {
    const {screen} = renderTestComponents();
    setPullRequestedFalse(screen);
    jest.advanceTimersByTime(PULL_INTERVAL_MS - 1);
    const {mock} = rerenderTestComponents(screen);
    expect(mock).toHaveBeenLastCalledWith(false);
  });
});
