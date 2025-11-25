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

import * as syncNotifications from 'terraso-mobile-client/context/SyncNotificationContext';
import * as syncHooks from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {
  PUSH_DEBOUNCE_MS,
  PUSH_RETRY_INTERVAL_MS,
  PushDispatcher,
} from 'terraso-mobile-client/store/sync/PushDispatcher';

jest.mock('terraso-mobile-client/store/sync/hooks/syncHooks', () => {
  return {
    ...jest.requireActual('terraso-mobile-client/store/sync/hooks/syncHooks'),
    useDebouncedIsOffline: jest.fn(),
    useDebouncedUnsyncedSoilDataSiteIds: jest.fn(),
    useDebouncedUnsyncedMetadataSiteIds: jest.fn(),
    useIsLoggedIn: jest.fn(),
    usePushDispatch: jest.fn(),
    useRetryInterval: jest.fn(),
  };
});
jest.mock('terraso-mobile-client/context/SyncNotificationContext', () => {
  return {
    ...jest.requireActual(
      'terraso-mobile-client/context/SyncNotificationContext',
    ),
    useSyncNotificationContext: jest.fn(),
  };
});

describe('PushDispatcher', () => {
  let useDebouncedIsOffline = jest.mocked(syncHooks.useDebouncedIsOffline);
  let useIsLoggedIn = jest.mocked(syncHooks.useIsLoggedIn);
  let useDebouncedUnsyncedSoilDataSiteIds = jest.mocked(
    syncHooks.useDebouncedUnsyncedSoilDataSiteIds,
  );
  let useDebouncedUnsyncedMetadataSiteIds = jest.mocked(
    syncHooks.useDebouncedUnsyncedMetadataSiteIds,
  );

  let dispatchPush = jest.fn();
  let usePushDispatch = jest.mocked(syncHooks.usePushDispatch);

  let beginRetry = jest.fn();
  let endRetry = jest.fn();
  let useRetryInterval = jest.mocked(syncHooks.useRetryInterval);

  let showError = jest.fn();
  let useSyncNotificationContext = jest.mocked(
    syncNotifications.useSyncNotificationContext,
  );

  beforeEach(() => {
    useDebouncedIsOffline.mockReset();
    useIsLoggedIn.mockReset();
    useDebouncedUnsyncedSoilDataSiteIds.mockReset();
    useDebouncedUnsyncedMetadataSiteIds.mockReset();

    // Default to empty arrays
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue([]);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue([]);

    dispatchPush.mockReset();
    usePushDispatch.mockReset();
    usePushDispatch.mockReturnValue(dispatchPush);

    beginRetry.mockReset();
    endRetry.mockReset();
    useRetryInterval.mockReset();
    useRetryInterval.mockReturnValue({
      beginRetry: beginRetry,
      endRetry: endRetry,
    });

    showError.mockReset();
    useSyncNotificationContext.mockReset();
    useSyncNotificationContext.mockReturnValue({
      showError: showError,
    });
  });

  test('uses correct interval for debounces', async () => {
    render(<PushDispatcher />);

    expect(useDebouncedIsOffline).toHaveBeenCalledWith(PUSH_DEBOUNCE_MS);
    expect(useDebouncedUnsyncedSoilDataSiteIds).toHaveBeenCalledWith(
      PUSH_DEBOUNCE_MS,
    );
    expect(useDebouncedUnsyncedMetadataSiteIds).toHaveBeenCalledWith(
      PUSH_DEBOUNCE_MS,
    );
  });

  test('uses correct site IDs for push dispatch', async () => {
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['efgh']);

    render(<PushDispatcher />);

    expect(usePushDispatch).toHaveBeenCalledWith({
      soilDataSiteIds: ['abcd'],
      soilMetadataSiteIds: ['efgh'],
    });
  });

  test('does not dispatch or retry by default', async () => {
    useIsLoggedIn.mockReturnValue(false);
    useDebouncedIsOffline.mockReturnValue(true);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue([]);

    render(<PushDispatcher />);

    expect(dispatchPush).toHaveBeenCalledTimes(0);
    expect(beginRetry).toHaveBeenCalledTimes(0);
    expect(endRetry).toHaveBeenCalledTimes(0);
  });

  test('dispatches an initial push when conditions are met', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({payload: {}});
    render(<PushDispatcher />);

    expect(dispatchPush).toHaveBeenCalledTimes(1);
    expect(beginRetry).toHaveBeenCalledTimes(0);
    expect(endRetry).toHaveBeenCalledTimes(0);
  });

  test('shows error notification when push has sync error', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {a: {value: 'DOES_NOT_EXIST'}},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
  });

  test('does not show error notification when push has no sync errors', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(0));
  });

  test('begins retry when push has graphql error', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({payload: {error: 'error'}});
    render(<PushDispatcher />);

    await waitFor(() => expect(beginRetry).toHaveBeenCalledTimes(1));
  });

  test('begins retry when push is rejected', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockRejectedValue('error');
    render(<PushDispatcher />);

    await waitFor(() => expect(beginRetry).toHaveBeenCalledTimes(1));
  });

  test('ends retry when logged-in changes', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    dispatchPush.mockRejectedValue('error');
    const handle = render(<PushDispatcher />);

    useIsLoggedIn.mockReturnValue(false);
    handle.rerender(<PushDispatcher />);

    await waitFor(() => expect(endRetry).toHaveBeenCalledTimes(1));
  });

  test('ends retry when online changes', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    dispatchPush.mockRejectedValue('error');
    const handle = render(<PushDispatcher />);

    useDebouncedIsOffline.mockReturnValue(true);
    handle.rerender(<PushDispatcher />);

    await waitFor(() => expect(endRetry).toHaveBeenCalledTimes(1));
  });

  test('ends retry when unsynced ids changes', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    dispatchPush.mockRejectedValue('error');
    const handle = render(<PushDispatcher />);

    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue([]);
    handle.rerender(<PushDispatcher />);

    await waitFor(() => expect(endRetry).toHaveBeenCalledTimes(1));
  });

  test('uses correct interval for retry', async () => {
    render(<PushDispatcher />);

    expect(useRetryInterval.mock.calls.length).toEqual(1);
    expect(useRetryInterval.mock.calls[0][0]).toEqual(PUSH_RETRY_INTERVAL_MS);
  });

  test('re-dispatches push on retry', async () => {
    dispatchPush.mockResolvedValue({});
    render(<PushDispatcher />);

    expect(useRetryInterval.mock.calls.length).toEqual(1);
    const retryAction = useRetryInterval.mock.calls[0][1];
    retryAction();

    expect(dispatchPush).toHaveBeenCalledTimes(1);
  });

  test('shows error notification when retried push has sync error', async () => {
    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {a: {value: 'DOES_NOT_EXIST'}},
        },
      },
    });
    render(<PushDispatcher />);

    expect(useRetryInterval.mock.calls.length).toEqual(1);
    const retryAction = useRetryInterval.mock.calls[0][1];
    retryAction();

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
  });

  test('shows error notification when push has metadata sync error', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilMetadataResults: {
          data: {},
          errors: {a: {value: 'DOES_NOT_EXIST'}},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
  });

  test('does not show error notification when metadata push has no sync errors', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['abcd']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilMetadataResults: {
          data: {},
          errors: {},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(0));
  });

  test('shows error notification when both soilData and metadata have errors', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['efgh']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {a: {value: 'DOES_NOT_EXIST'}},
        },
        soilMetadataResults: {
          data: {},
          errors: {b: {value: 'INVALID'}},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
  });

  test('shows error notification when only soilData has errors (metadata succeeds)', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['efgh']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {a: {value: 'DOES_NOT_EXIST'}},
        },
        soilMetadataResults: {
          data: {},
          errors: {},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
  });

  test('shows error notification when only metadata has errors (soilData succeeds)', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['efgh']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {},
        },
        soilMetadataResults: {
          data: {},
          errors: {b: {value: 'INVALID'}},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
  });

  test('does not show error notification when both soilData and metadata succeed', async () => {
    useIsLoggedIn.mockReturnValue(true);
    useDebouncedIsOffline.mockReturnValue(false);
    useDebouncedUnsyncedSoilDataSiteIds.mockReturnValue(['abcd']);
    useDebouncedUnsyncedMetadataSiteIds.mockReturnValue(['efgh']);

    dispatchPush.mockResolvedValue({
      payload: {
        soilDataResults: {
          data: {},
          errors: {},
        },
        soilMetadataResults: {
          data: {},
          errors: {},
        },
      },
    });
    render(<PushDispatcher />);

    await waitFor(() => expect(showError).toHaveBeenCalledTimes(0));
  });
});
