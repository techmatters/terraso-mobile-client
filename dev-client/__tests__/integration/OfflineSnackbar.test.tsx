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

import 'terraso-mobile-client/translations';
import 'terraso-mobile-client/config';

import {PaperProvider, Portal} from 'react-native-paper';

import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import {OfflineSnackbar} from 'terraso-mobile-client/components/messages/OfflineSnackbar';
import {FeatureFlagName} from 'terraso-mobile-client/config/featureFlags';
import * as connectivityHooks from 'terraso-mobile-client/hooks/connectivityHooks';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {ProjectViewScreen} from 'terraso-mobile-client/screens/ProjectViewScreen/ProjectViewScreen';

jest.mock('terraso-mobile-client/config/featureFlags', () => {
  const actual = jest.requireActual(
    'terraso-mobile-client/config/featureFlags',
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
    useIsOffline: jest.fn(),
  };
});

jest.mock('terraso-client-shared/terrasoApi/api', () => {
  const actual = jest.requireActual('terraso-client-shared/terrasoApi/api');
  return {
    ...actual,
    requestGraphQL: jest.fn(),
  };
});

describe('Offline snackbar', () => {
  const useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);
  const snackbarText = "You are offline. Projects can't be edited.";

  beforeEach(() => {
    useIsOfflineMock.mockReset().mockReturnValue(false);
  });

  test('appears when offline and first rendering project screen', () => {
    useIsOfflineMock.mockReturnValue(true);

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <OfflineSnackbar />
          <ProjectViewScreen projectId="1" />
        </Portal.Host>
      </PaperProvider>,
      {
        route: 'PROJECT_VIEW',
        initialState: testState,
      },
    );

    expect(screen.getByText(snackbarText)).toBeTruthy();
  });

  test('does not appear when online and first rendering project screen', () => {
    useIsOfflineMock.mockReturnValue(false);

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <OfflineSnackbar />
          <ProjectViewScreen projectId="1" />
        </Portal.Host>
      </PaperProvider>,
      {
        route: 'PROJECT_VIEW',
        initialState: testState,
      },
    );

    expect(screen.queryByText(snackbarText)).toBeFalsy();
  });

  test('does not appear when offline on non-project-specific screen', () => {
    useIsOfflineMock.mockReturnValue(true);

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <OfflineSnackbar />
          <ProjectListScreen />
        </Portal.Host>
      </PaperProvider>,
      {
        route: 'BOTTOM_TABS',
        initialState: testState,
      },
    );

    expect(screen.queryByText(snackbarText)).toBeFalsy();
  });

  test('appears when going offline', () => {
    useIsOfflineMock.mockReturnValue(false);

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <OfflineSnackbar />
          <ProjectViewScreen projectId="1" />
        </Portal.Host>
      </PaperProvider>,
      {
        route: 'PROJECT_VIEW',
        initialState: testState,
      },
    );

    useIsOfflineMock.mockReset().mockReturnValue(true);
    screen.rerender(
      <PaperProvider>
        <Portal.Host>
          <OfflineSnackbar />
          <ProjectViewScreen projectId="1" />
        </Portal.Host>
      </PaperProvider>,
    );

    expect(screen.getByText(snackbarText)).toBeTruthy();
  });

  // test('disappears when returning online', () => {});
  // test('is shown when thunk fails offline', () => {});
  // test('is not shown when thunk fails online', () => {});
  // test('is not shown when thunk succeeds online', () => {});
  // test('is not shown when thunk succeeds offline', () => {});
});
