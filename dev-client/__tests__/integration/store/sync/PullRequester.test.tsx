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

import {Button} from 'react-native';

import {fireEvent} from '@testing-library/react-native';
import {render} from '@testing/integration/utils';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
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

/* 
    Render PullRequester
    - Test that on open, pullRequested is false
    - Test that after 10 seconds pullRequested is false 
    - Test that after 5 minutes pullRequested is true (or the pull itself has triggered)

    Render PullDispatcher
    - Test that when a pull is requested and [], the pull itself gets triggered

    PullRequester + PullDispatcher
    - 
*/

// jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
//   return {
//     useDebouncedIsOffline: jest.fn(),
//     useIsLoggedIn: jest.fn(),
//   };
// });

// Allows test to inspect the state with: screen.getByTestId('pullRequestedState')
// and set the state with: fireEvent.press(screen.getByText('setPullRequestedFalse'))
const ExposePullRequestedForTest = () => {
  const {pullRequested, setPullRequested} = usePullRequested();
  return (
    <>
      <Button
        title="setPullRequestedFalse"
        onPress={() => setPullRequested(false)}
      />
      <Button
        title="setPullRequestedTrue"
        onPress={() => setPullRequested(true)}
      />
      <Text testID="pullRequestedState">{pullRequested.toString()}</Text>
    </>
  );
};

type RenderedScreen = ReturnType<typeof render>;
const setPullRequestedFalse = (screen: RenderedScreen) => {
  fireEvent.press(screen.getByText('setPullRequestedFalse'));
  console.log('Clearing pullRequested');
};
const getPullRequestedText = (screen: RenderedScreen) => {
  return screen.getByTestId('pullRequestedState');
};

const renderTestComponents = (initialState?: Partial<AppState>) => {
  return render(
    <PullContextProvider>
      <PullRequester />
      <ExposePullRequestedForTest />
    </PullContextProvider>,
    {initialState: initialState},
  );
};
const rerenderTestComponents = (screen: RenderedScreen) => {
  screen.rerender(
    <PullContextProvider>
      <PullRequester />
      <ExposePullRequestedForTest />
    </PullContextProvider>,
  );
};

describe('PullRequester', () => {
  test('requests pull on first mount', () => {
    const screen = renderTestComponents();
    expect(screen.getByTestId('pullRequestedState')).toHaveTextContent('true');
  });

  test('does not request pull immediately after pull is set to false', () => {
    const screen = renderTestComponents();
    // All the following tests should set pullRequested to false after first render
    // as first render will always set it to true
    setPullRequestedFalse(screen);
    rerenderTestComponents(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('false');
  });
});

describe('PullRequester + isOffline', () => {
  const offlineSpy = jest.spyOn(syncHooks, 'useDebouncedIsOffline');
  beforeEach(() => {
    offlineSpy.mockClear();
  });
  test('requests pull when coming online from offline', () => {
    offlineSpy.mockClear().mockReturnValue(true);
    const screen = renderTestComponents();
    setPullRequestedFalse(screen);
    offlineSpy.mockClear().mockReturnValue(false);
    rerenderTestComponents(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('true');
  });

  test('does not request pull when going offline from online', () => {
    offlineSpy.mockClear().mockReturnValue(false);
    const screen = renderTestComponents();
    setPullRequestedFalse(screen);
    offlineSpy.mockClear().mockReturnValue(true);
    rerenderTestComponents(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('false');
  });

  test('does not request pull when consistently online', () => {
    offlineSpy.mockClear().mockReturnValue(false);
    const screen = renderTestComponents();
    setPullRequestedFalse(screen);
    rerenderTestComponents(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('false');
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
    const screen = renderTestComponents();
    setPullRequestedFalse(screen);
    jest.advanceTimersByTime(PULL_INTERVAL_MS + 1);
    rerenderTestComponents(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('true');
  });
  test('does not request pull before specified amount of time', () => {
    const screen = renderTestComponents();
    setPullRequestedFalse(screen);
    jest.advanceTimersByTime(PULL_INTERVAL_MS - 1);
    rerenderTestComponents(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('false');
  });
});
