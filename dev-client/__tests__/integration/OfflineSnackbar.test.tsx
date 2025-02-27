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

import { Button } from 'react-native';
import { PaperProvider, Portal } from 'react-native-paper';

import { act, fireEvent } from '@testing-library/react-native';
import { testState } from '@testing/integration/data';
import { render } from '@testing/integration/utils';

import * as projectService from 'terraso-client-shared/project/projectService';

import { OfflineSnackbar } from 'terraso-mobile-client/components/messages/OfflineSnackbar';
import { FeatureFlagName } from 'terraso-mobile-client/config/featureFlags';
import * as connectivityHooks from 'terraso-mobile-client/hooks/connectivityHooks';
import { deleteProject } from 'terraso-mobile-client/model/project/projectSlice';
import { ProjectListScreen } from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import { ProjectViewScreen } from 'terraso-mobile-client/screens/ProjectViewScreen/ProjectViewScreen';
import { AppState, useDispatch } from 'terraso-mobile-client/store';

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

    act(() => {
      jest.runAllTimers();
    })

    const snackbar = screen.queryByTestId(snackbarTestId);
    expect(snackbar).not.toBeOnTheScreen();
  });


  test('can be dismissed, and is shown when thunk fails offline', async () => {
    console.log('------ TEST: dismiss + shown when thunk fails offline ------');
    useIsOfflineMock.mockReturnValue(true);
    
    const projectId = 'project1';
    const initialState = {
      project: {
        projects: {
          [projectId]: {
            id: projectId,
            name: '1',
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
    
    // Button that simulates dispatching something to server
    deleteProjectMock.mockReturnValue(Promise.reject(['rejected']));
    const TestButton = () => {
      const dispatch = useDispatch();
      return (
        <Button
          title="dispatch"
          testID="test-delete-project-btn"
          onPress={() => {
            console.log('PRESSED test button');
            dispatch(deleteProject({id: projectId}));
          }}
        />
      );
    };

    const screen = render(
        <PaperProvider>
        <Portal.Host>
          <TestButton />
          <OfflineSnackbar />
          <ProjectViewScreen projectId="1" />
        </Portal.Host>
      </PaperProvider>,
      {route: 'PROJECT_VIEW', initialState},
    );
    console.log("2")

    const snackbar = screen.queryByTestId(snackbarTestId);
    expect(snackbar).toBeOnTheScreen();
 
    // Dismiss snackbar
    fireEvent(snackbar, 'onDismiss');
    act(() => {
      // jest.advanceTimersByTime(1500)
      jest.runAllTimers()
    })
    console.log("3")

    // Confirm snackbar is gone
    // This fails the entire test suite, though the snackbar was rendering with visible=false
    // Question 1: Why would an expect call cause the entire suite to fail, not just the single test?
    //             expect(undefined).toBeTruthy();    also fails the entire suite 
    // Question 2: Why this would fail if I don't explicitly call rerender? 
    //             Shouldn't rerenders be automatically triggered?
    // Tried: calling rerender with the same components as the first render. This passed, but I think
    //        it was just because it created a new OfflineSnackbar with visible initialized to false
    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();


    // Fire the test button event to make a server request. The request is mocked to fail, 
    // which should add a message to the notificationsSlice and trigger the snackbar
    fireEvent.press(screen.queryByTestId('test-delete-project-btn'));
    act(() => {
      // jest.advanceTimersByTime(1500)
      jest.runAllTimers();
    });
    console.log("4")

    // This passes if the failing expect is removed, but it may only be because we never actually
    // remove the snackbar, so it's still on the screen from the first render? 
    // But also the last console.log reports the snackbar with visible=false, so I'm 
    // just confused
    expect(screen.queryByTestId(snackbarTestId)).toBeOnTheScreen();
    
});

  // test('is not shown when thunk fails online', () => {});
  // test('is not shown when thunk succeeds online', () => {});
  // test('is not shown when thunk succeeds offline', () => {});
});
