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
    // Need to run the jest timers, and  wrap it in act() to make sureresulting state updates
    // are fully applied
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();
  });

  test('can be dismissed, and is shown when thunk fails offline', async () => {
    console.log('------ TEST: dismiss + shown when thunk fails offline ------');
    useIsOfflineMock.mockReturnValue(true);

    const projectId = '1';
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
          <ProjectViewScreen projectId={projectId} />
        </Portal.Host>
      </PaperProvider>,
      {route: 'PROJECT_VIEW', initialState},
    );
    console.log('2');

    const snackbar = screen.queryByTestId(snackbarTestId);
    expect(snackbar).toBeOnTheScreen();

    // Dismiss snackbar
    fireEvent(snackbar, 'onDismiss');

    // Question 0: If we await act, the entire suite fails in the same way as in Question 1 below.
    // Why would that make a difference?
    act(() => {
      jest.runAllTimers();
    });
    console.log('3');

    // Question 1: Why would `expect(undefined).toBeTruthy();` here cause the entire suite to fail, not just the single test?
    //   If put further up in the test, or in other tests, it only fails the single test, not the entire suite.
    //
    // Output from `npm run test OfflineSnackbar`:
    //   Test suite failed to run
    //   TypeError: Cannot set properties of undefined (setting 'message')
    //     at node_modules/jest-circus/build/formatNodeAssertErrors.js:47:25
    //         at Array.map (<anonymous>)
    //   Test Suites: 1 failed, 1 total
    //   Tests:       0 total
    // I suspect this is the erroring line in the test library:
    // https://github.com/jestjs/jest/blob/main/packages/jest-circus/src/formatNodeAssertErrors.ts#L58
    expect(screen.queryByTestId(snackbarTestId)).not.toBeOnTheScreen();

    // Fire the test button event to make a server request. The request is mocked to fail,
    // which should add a message to the notificationsSlice and trigger the snackbar
    fireEvent.press(screen.queryByTestId('test-delete-project-btn'));
    await act(() => {
      jest.runAllTimers();
    });

    console.log('4');

    // Question 2: When should an act call be awaited or not?
    // The expect below fails if we do not await the act above -- even though the IDE says `await` has
    // no effect on the expression. I had thought you'd only need to await if the function passed in
    // is async, but perhaps I'm wrong. Why would this make a difference at all, and what is special about
    // this part of the test that it doesn't make a difference in other tests or earlier in the test?
    // Output:
    //   expect(received).toBeOnTheScreen()
    //   received value must be a host element.
    //   Received has value: null
    expect(screen.queryByTestId(snackbarTestId)).toBeOnTheScreen();
  });

  // test('is not shown when thunk fails online', () => {});
  // test('is not shown when thunk succeeds online', () => {});
  // test('is not shown when thunk succeeds offline', () => {});
});
