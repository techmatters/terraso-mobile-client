/*
 * Copyright © 2025 Technology Matters
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

import {fireEvent} from '@testing-library/react-native';
import {render} from '@testing/integration/utils';

import {AppContent} from 'terraso-mobile-client/app/AppContent';

// NOTE: these tests depend on each other and must be run in the same
//   order because they rely on global KV store state. there is a tech
//   debt issue to make the kvStorage instanced to each test
describe('app launch flows', () => {
  test('welcome screen displays on initial app launch', async () => {
    const app = render(<AppContent />);

    expect(app.getByTestId('welcome-screen')).toBeOnTheScreen();
  });

  test('welcome screen displays on second app launch', async () => {
    const app = render(<AppContent />);

    expect(app.getByTestId('welcome-screen')).toBeOnTheScreen();
  });

  test('login screen displays after welcome screen', async () => {
    const app = render(<AppContent />);

    fireEvent.press(app.getByRole('button', {name: 'Get started'}));

    expect(app.getByTestId('login-screen')).toBeOnTheScreen();
  });

  test('welcome screen no longer displays after navigating to login screen', async () => {
    const app = render(<AppContent />);

    expect(app.queryByTestId('welcome-screen')).not.toBeOnTheScreen();
    expect(app.getByTestId('login-screen')).toBeOnTheScreen();
  });

  test('sites screen displays when launching with user data in store', async () => {
    const app = render(<AppContent />, {
      initialState: {
        account: {
          currentUser: {
            // @ts-ignore
            data: {},
          },
        },
      },
    });

    expect(app.getByTestId('sites-screen')).toBeOnTheScreen();
  });
});
