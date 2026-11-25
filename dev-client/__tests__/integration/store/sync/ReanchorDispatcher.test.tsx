/*
 * Copyright © 2026 Technology Matters
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

import * as syncService from 'terraso-client-shared/soilId/syncService';

import * as appStateHooks from 'terraso-mobile-client/hooks/appStateHooks';
import * as connectivityHooks from 'terraso-mobile-client/hooks/connectivityHooks';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {AppState as ReduxAppState} from 'terraso-mobile-client/store';
import {
  PROD_REANCHOR_DONE_KEY,
  ReanchorDispatcher,
} from 'terraso-mobile-client/store/sync/ReanchorDispatcher';

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => ({
  ...jest.requireActual('terraso-mobile-client/hooks/connectivityHooks'),
  useIsOffline: jest.fn(),
}));

jest.mock('terraso-mobile-client/hooks/appStateHooks', () => ({
  ...jest.requireActual('terraso-mobile-client/hooks/appStateHooks'),
  useAppState: jest.fn(),
}));

jest.mock('terraso-client-shared/soilId/syncService', () => ({
  ...jest.requireActual('terraso-client-shared/soilId/syncService'),
  pullUserData: jest.fn(),
}));

describe('ReanchorDispatcher', () => {
  const useIsOfflineMock = jest.mocked(connectivityHooks.useIsOffline);
  const useAppStateMock = jest.mocked(appStateHooks.useAppState);
  const pullUserDataMock = jest.mocked(syncService.pullUserData);

  const stateWithLoggedInUser = {
    account: {
      currentUser: {data: {id: 'userid1'}},
    },
  } as Partial<ReduxAppState>;

  beforeEach(() => {
    useIsOfflineMock.mockReset().mockReturnValue(false);
    useAppStateMock.mockReset().mockReturnValue('active');
    // A never-resolving promise keeps the re-anchor "in flight" so no async
    // state updates land after the assertions.
    pullUserDataMock.mockReset().mockReturnValue(new Promise(() => {}));
    // The one-time guard is the persisted flag; start each test with it unset.
    kvStorage.remove(PROD_REANCHOR_DONE_KEY);
  });

  test('dispatches re-anchor when logged in, online, foreground, and flag unset', () => {
    render(<ReanchorDispatcher />, {initialState: stateWithLoggedInUser});
    expect(pullUserDataMock).toHaveBeenCalled();
    expect(pullUserDataMock.mock.calls[0][0]).toBe('userid1');
  });

  test('does not re-anchor when no logged-in user', () => {
    render(<ReanchorDispatcher />, {initialState: {}});
    expect(pullUserDataMock).not.toHaveBeenCalled();
  });

  test('does not re-anchor when offline', () => {
    useIsOfflineMock.mockReturnValue(true);
    render(<ReanchorDispatcher />, {initialState: stateWithLoggedInUser});
    expect(pullUserDataMock).not.toHaveBeenCalled();
  });

  test('does not re-anchor when app is not in foreground', () => {
    useAppStateMock.mockReturnValue('background');
    render(<ReanchorDispatcher />, {initialState: stateWithLoggedInUser});
    expect(pullUserDataMock).not.toHaveBeenCalled();
  });

  test('does not re-anchor when the done flag is already set', () => {
    kvStorage.setBool(PROD_REANCHOR_DONE_KEY, true);
    render(<ReanchorDispatcher />, {initialState: stateWithLoggedInUser});
    expect(pullUserDataMock).not.toHaveBeenCalled();
  });
});
