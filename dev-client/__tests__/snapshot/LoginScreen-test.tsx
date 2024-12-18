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

import * as connectivityHooks from 'terraso-mobile-client/hooks/connectivityHooks';
import {LoginScreen} from 'terraso-mobile-client/screens/LoginScreen';

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => {
  return {
    useIsOffline: jest.fn(),
  };
});

test('renders correctly', () => {
  const useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);

  useIsOfflineMock.mockReset().mockReturnValue(false);

  const screen = render(<LoginScreen />, {
    initialState: {
      account: {
        currentUser: {
          data: null,
          fetching: false,
        },
      } as any,
    },
  }).toJSON();

  expect(screen).toMatchSnapshot();
});
