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

jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
  return {
    useDebouncedIsOffline: jest.fn(),
    useIsLoggedIn: jest.fn(),
  };
});

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

describe('PullRequester', () => {
  beforeEach(() => {});

  test('requests pull on first mount', () => {
    const screen = render(
      <PullContextProvider>
        <PullRequester />
        <ExposePullRequestedForTest />
      </PullContextProvider>,
    );
    expect(screen.getByTestId('pullRequestedState')).toHaveTextContent('true');
  });

  test('does not request pull immediately after pull is set to false', () => {
    const screen = render(
      <PullContextProvider>
        <PullRequester />
        <ExposePullRequestedForTest />
      </PullContextProvider>,
    );
    fireEvent.press(screen.getByText('setPullRequestedFalse'));
    expect(screen.getByTestId('pullRequestedState')).toHaveTextContent('false');
  });
});
