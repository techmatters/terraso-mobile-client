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

import {waitFor} from '@testing-library/react-native';
import {render} from '@testing/integration/utils';

import * as syncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {
  PUSH_DEBOUNCE_MS,
  PUSH_RETRY_INTERVAL_MS,
  PushDispatcher,
} from 'terraso-mobile-client/store/sync/PushDispatcher';

jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
  return {
    useDebouncedIsOffline: jest.fn(),
    useDebouncedUnsyncedSiteIds: jest.fn(),
    useIsLoggedIn: jest.fn(),
    usePushDispatch: jest.fn(),
    useRetryInterval: jest.fn(),
  };
});

describe('PushDispatcher', () => {
  let useDebouncedIsOffline = jest.mocked(syncHooks.useDebouncedIsOffline);
  let useIsLoggedIn = jest.mocked(syncHooks.useIsLoggedIn);
  let useDebouncedUnsyncedSiteIds = jest.mocked(
    syncHooks.useDebouncedUnsyncedSiteIds,
  );

  let dispatchPush = jest.fn();
  let usePushDispatch = jest.mocked(syncHooks.usePushDispatch);

  let beginRetry = jest.fn();
  let endRetry = jest.fn();
  let useRetryInterval = jest.mocked(syncHooks.useRetryInterval);

  beforeEach(() => {
    useDebouncedIsOffline.mockReset();
    useIsLoggedIn.mockReset();
    useDebouncedUnsyncedSiteIds.mockReset();
    useDebouncedUnsyncedSiteIds.mockReset();
    useDebouncedUnsyncedSiteIds.mockReset();

    dispatchPush.mockReset();
    usePushDispatch.mockReset();
    usePushDispatch.mockReturnValue(dispatchPush);

    beginRetry.mockReset();
    endRetry.mockReset();
    useRetryInterval.mockReset();
    jest.mocked(useRetryInterval).mockReturnValue({
      beginRetry: beginRetry,
      endRetry: endRetry,
    });
  });

  test('uses correct interval for debounces', async () => {
    render(<PushDispatcher />);

    expect(useDebouncedIsOffline).toHaveBeenCalledWith(PUSH_DEBOUNCE_MS);
    expect(useDebouncedUnsyncedSiteIds).toHaveBeenCalledWith(PUSH_DEBOUNCE_MS);
  });

  test('uses correct interval for retry', async () => {
    render(<PushDispatcher />);

    expect(useRetryInterval).toHaveBeenCalledWith(
      PUSH_RETRY_INTERVAL_MS,
      dispatchPush,
    );
  });

  test('uses correct site IDs for push dispatch', async () => {
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);

    render(<PushDispatcher />);

    expect(usePushDispatch).toHaveBeenCalledWith(['abcd']);
  });

  test('does not dispatch or retry by default', async () => {
    useIsLoggedIn.mockReturnValue(false);
    useDebouncedIsOffline.mockReturnValue(true);
    useDebouncedUnsyncedSiteIds.mockReturnValue([]);

    render(<PushDispatcher />);

    expect(dispatchPush).toHaveBeenCalledTimes(0);
    expect(beginRetry).toHaveBeenCalledTimes(0);
    expect(endRetry).toHaveBeenCalledTimes(0);
  });

  test('dispatches an initial push when conditions are met', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({payload: {}});
    render(<PushDispatcher />);

    expect(dispatchPush).toHaveBeenCalledTimes(1);
    expect(beginRetry).toHaveBeenCalledTimes(0);
    expect(endRetry).toHaveBeenCalledTimes(0);
  });

  test('begins retry when push has error', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({payload: {error: 'error'}});
    render(<PushDispatcher />);

    await waitFor(() => expect(beginRetry).toHaveBeenCalledTimes(1));
  });

  test('begins retry when push is rejected', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockRejectedValue('error');
    render(<PushDispatcher />);

    await waitFor(() => expect(beginRetry).toHaveBeenCalledTimes(1));
  });

  test('ends retry when logged-in changes', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);
    dispatchPush.mockRejectedValue('error');
    const handle = render(<PushDispatcher />);

    useIsLoggedIn.mockReturnValue(false);
    handle.rerender(<PushDispatcher />);

    await waitFor(() => expect(endRetry).toHaveBeenCalledTimes(1));
  });

  test('ends retry when online changes', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);
    dispatchPush.mockRejectedValue('error');
    const handle = render(<PushDispatcher />);

    useDebouncedIsOffline.mockReturnValue(true);
    handle.rerender(<PushDispatcher />);

    await waitFor(() => expect(endRetry).toHaveBeenCalledTimes(1));
  });

  test('ends retry when unsynced ids changes', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSiteIds.mockReturnValue(['abcd']);
    dispatchPush.mockRejectedValue('error');
    const handle = render(<PushDispatcher />);

    useDebouncedUnsyncedSiteIds.mockReturnValue([]);
    handle.rerender(<PushDispatcher />);

    await waitFor(() => expect(endRetry).toHaveBeenCalledTimes(1));
  });
});
