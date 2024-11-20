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

import {useContext} from 'react';

import {render} from '@testing/integration/utils';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  PullContextProvider,
  PullRequestedContext,
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

const StateTestComponent = () => {
  const context = useContext(PullRequestedContext);
  return (
    <Text testID="stateTestComponent">{context.pullRequested.toString()}</Text>
  );
};

describe('PullRequester', () => {
  beforeEach(() => {});

  test('requests pull on first mount', async () => {
    const screen = render(
      <PullContextProvider>
        <PullRequester />
        <StateTestComponent />
      </PullContextProvider>,
    );
    expect(screen.getByTestId('stateTestComponent')).toHaveTextContent('true');
  });
});
