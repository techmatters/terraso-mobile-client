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

import 'terraso-mobile-client/translations';
import 'terraso-mobile-client/config';

import {Button} from 'react-native';
import {PaperProvider, Portal} from 'react-native-paper';

import {act, fireEvent} from '@testing-library/react-native';
import {testState} from '@testing/integration/data';
import {render} from '@testing/integration/utils';

import * as projectService from 'terraso-client-shared/project/projectService';

import {OfflineSnackbar} from 'terraso-mobile-client/components/messages/OfflineSnackbar';
import {FeatureFlagName} from 'terraso-mobile-client/config/featureFlags';
import * as connectivityHooks from 'terraso-mobile-client/hooks/connectivityHooks';
import {deleteProject} from 'terraso-mobile-client/model/project/projectSlice';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {ProjectViewScreen} from 'terraso-mobile-client/screens/ProjectViewScreen/ProjectViewScreen';
import {AppState, useDispatch} from 'terraso-mobile-client/store';

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

jest.mock('terraso-client-shared/project/projectService', () => {
  const actual = jest.requireActual(
    'terraso-client-shared/project/projectService',
  );
  return {
    ...actual,
    deleteProject: jest.fn(),
  };
});

describe('Offline snackbar', () => {
  const useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);
  const deleteProjectMock = jest.mocked(projectService.deleteProject);

  const snackbarTestId = 'offline-snackbar';

  beforeEach(() => {
    useIsOfflineMock.mockReset().mockReturnValue(false);
    deleteProjectMock.mockReset();
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

    expect(screen.queryByTestId(snackbarTestId)).toBeOnTheScreen();
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

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();
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

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();
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

    expect(screen.queryByTestId(snackbarTestId)).toBeOnTheScreen();
  });

  test('disappears when returning online', async () => {
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

    expect(screen.queryByTestId(snackbarTestId)).toBeTruthy();

    useIsOfflineMock.mockReturnValue(false);
    screen.rerender(
      <PaperProvider>
        <Portal.Host>
          <OfflineSnackbar />
          <ProjectViewScreen projectId="1" />
        </Portal.Host>
      </PaperProvider>,
    );

    // FYI: Because the snackbar has an animation transition before hiding and returning null,
    // Need to run the jest timers, and  wrap it in act() to make sure resulting state updates
    // are fully applied. And React recommends using act with await and an async function.
    await act(async () => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();
  });
});

describe('Offline snackbar (with mocked async thunk call)', () => {
  const useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);
  const deleteProjectMock = jest.mocked(projectService.deleteProject);

  const snackbarTestId = 'offline-snackbar';
  const projectId = '1';
  const initialAppState = {
    project: {
      projects: {
        [projectId]: {
          id: projectId,
          name: projectId,
          privacy: 'PRIVATE',
          archived: false,
          updatedAt: '',
          measurementUnits: 'METRIC',
          description: 'desc',
          memberships: {},
          sites: {},
        },
      },
    },
  } as Partial<AppState>;

  // Button component that simulates dispatching something to server
  const TestButton = () => {
    const dispatch = useDispatch();
    return (
      <Button
        title="dispatch"
        testID="test-delete-project-btn"
        onPress={() => {
          dispatch(deleteProject({id: projectId}));
        }}
      />
    );
  };

  beforeEach(() => {
    useIsOfflineMock.mockReset().mockReturnValue(false);
    deleteProjectMock.mockReset();
  });

  test('can be dismissed, and is shown when thunk fails offline', async () => {
    useIsOfflineMock.mockReturnValue(true);

    // FYI: Need to mockImplementation, not just mockReturn for async reasons
    deleteProjectMock.mockImplementation(async () =>
      Promise.reject(['rejected']),
    );

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <TestButton />
          <OfflineSnackbar />
          <ProjectViewScreen projectId={projectId} />
        </Portal.Host>
      </PaperProvider>,
      {route: 'PROJECT_VIEW', initialState: initialAppState},
    );

    const snackbar = screen.queryByTestId(snackbarTestId);
    expect(snackbar).toBeOnTheScreen();

    // Dismiss snackbar
    // FYI: run timers so snackbar's dismissal animation completes
    await act(async () => {
      fireEvent(snackbar, 'onDismiss');
    });
    await act(async () => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();

    // Fire the test button event to make a server request. The request is mocked to fail,
    // which should add a message to the notificationsSlice and trigger the snackbar.
    await act(async () => {
      fireEvent.press(screen.queryByTestId('test-delete-project-btn'));
    });

    expect(screen.queryByTestId(snackbarTestId)).toBeOnTheScreen();
  });

  test('is not shown when thunk fails online', async () => {
    useIsOfflineMock.mockReturnValue(false);
    deleteProjectMock.mockImplementation(async () =>
      Promise.reject(['rejected']),
    );

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <TestButton />
          <OfflineSnackbar />
          <ProjectViewScreen projectId={projectId} />
        </Portal.Host>
      </PaperProvider>,
      {route: 'PROJECT_VIEW', initialState: initialAppState},
    );

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.queryByTestId('test-delete-project-btn'));
    });

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();
  });

  test('is not shown when thunk succeeds offline', async () => {
    useIsOfflineMock.mockReturnValue(true);
    deleteProjectMock.mockImplementation(async () =>
      Promise.resolve('unused test success message'),
    );

    const screen = render(
      <PaperProvider>
        <Portal.Host>
          <TestButton />
          <OfflineSnackbar />
          <ProjectViewScreen projectId={projectId} />
        </Portal.Host>
      </PaperProvider>,
      {route: 'PROJECT_VIEW', initialState: initialAppState},
    );

    const snackbar = screen.queryByTestId(snackbarTestId);
    expect(snackbar).toBeOnTheScreen();

    // Dismiss snackbar
    // FYI: run timers so snackbar's dismissal animation completes
    await act(async () => {
      fireEvent(snackbar, 'onDismiss');
    });
    await act(async () => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.queryByTestId('test-delete-project-btn'));
    });

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();
  });
});
