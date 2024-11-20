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
import {
  PullContextProvider,
  usePullRequested,
} from 'terraso-mobile-client/store/sync/hooks/SyncContext';
import * as SyncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {PullRequester} from 'terraso-mobile-client/store/sync/PullRequester';

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
};
const getPullRequestedText = (screen: RenderedScreen) => {
  return screen.getByTestId('pullRequestedState');
};
const renderTestComponents = () => {
  return render(
    <PullContextProvider>
      <PullRequester />
      <ExposePullRequestedForTest />
    </PullContextProvider>,
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
    setPullRequestedFalse(screen);
    expect(getPullRequestedText(screen)).toHaveTextContent('false');
  });
});

describe('PullRequester + isOffline', () => {
  const offlineSpy = jest.spyOn(SyncHooks, 'useDebouncedIsOffline');
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
});

describe('PullRequester + sitesWithErrors', () => {});

describe('PullRequester + interval', () => {});
