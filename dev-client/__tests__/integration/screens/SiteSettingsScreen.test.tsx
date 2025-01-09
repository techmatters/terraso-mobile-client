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

import {userEvent, waitFor} from '@testing-library/react-native';
import {render} from '@testing/integration/utils';

import * as terrasoApi from 'terraso-client-shared/terrasoApi/api';

import {FeatureFlagName} from 'terraso-mobile-client/config/featureFlags';
import {SyncNotificationContextProvider} from 'terraso-mobile-client/context/SyncNotificationContext';
import {SiteSettingsScreen} from 'terraso-mobile-client/screens/SiteSettingsScreen/SiteSettingsScreen';
import {AppState as ReduxAppState} from 'terraso-mobile-client/store';

jest.mock('terraso-mobile-client/config/featureFlags', () => {
  const actual = jest.requireActual(
    'terraso-mobile-client/navigation/hooks/useNavigation',
  );
  return {
    ...actual,
    isFlagEnabled: (flag: FeatureFlagName) => {
      if (flag === 'FF_offline') return true;
    },
  };
});

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => {
  return {
    useIsOffline: jest.fn(() => false),
  };
});

describe('SiteSettingsScreen', () => {
  const site1 = {
    id: 'site1',
    name: 'Site 1',
    latitude: 0,
    longitude: 0,
    privacy: 'PRIVATE',
    archived: false,
    updatedAt: '',
    notes: {},
  };
  const site2 = {
    id: 'site2',
    name: 'Site 2',
    latitude: 1,
    longitude: 1,
    privacy: 'PRIVATE',
    archived: false,
    updatedAt: '',
    notes: {},
  };
  const stateWithTwoSites = {
    site: {
      sites: {
        site1: site1,
        site2: site2,
      },
    },
  } as Partial<ReduxAppState>;

  test('displays delete button and no error', () => {
    const screen = render(
      <SyncNotificationContextProvider>
        <SiteSettingsScreen siteId="site1" />
      </SyncNotificationContextProvider>,
      {
        route: 'SITE_TABS',
        initialState: stateWithTwoSites,
      },
    );

    expect(screen.getByText('Delete this site')).toBeOnTheScreen();
    expect(screen.queryByTestId('error-dialog')).not.toBeOnTheScreen();
  });

  test('renders no content and displays error if missing site', () => {
    const screen = render(
      <SyncNotificationContextProvider>
        <SiteSettingsScreen siteId="site-that-does-not-exist" />
      </SyncNotificationContextProvider>,
      {
        route: 'SITE_TABS',
        initialState: stateWithTwoSites,
      },
    );

    expect(screen.queryByText('Delete this site')).toBeNull();
    expect(screen.getByTestId('error-dialog')).toBeOnTheScreen();
  });

  test('displays content and no error if site was deleted from this screen', async () => {
    const screen = render(
      <SyncNotificationContextProvider>
        <SiteSettingsScreen siteId="site2" />
      </SyncNotificationContextProvider>,
      {
        route: 'SITE_TABS',
        initialState: stateWithTwoSites,
      },
    );

    const mockApiCall = jest
      .spyOn(terrasoApi, 'requestGraphQL')
      .mockReturnValue(
        Promise.resolve({
          deleteSite: {
            errors: [],
          },
        }),
      );

    const deleteButton = screen.getByText('Delete this site');
    await userEvent.press(deleteButton);

    const confirmDeleteButton = await screen.findByText('Delete');
    await userEvent.press(confirmDeleteButton);

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalled();
    });

    expect(screen.getByText('Delete this site')).toBeOnTheScreen();
    expect(screen.queryByTestId('error-dialog')).not.toBeOnTheScreen();
  });
});
