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

import {useCallback, useEffect, useRef} from 'react';

import {useDebounce} from 'use-debounce';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {pushSoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const PUSH_DEBOUNCE_MS = 500;
export const PUSH_RETRY_INTERVAL_MS = 1000 * 60;

/**
 * Automated system to dispatch push operations to the server.
 *
 * Listens for unsynced data and, when the app is online, sets up a Redux dispatch to push
 * the relevant entities to the server. If the push does not succeed, sets an interval to
 * retry the push until it succeeds. Retries are canceled any time the underlying state changes
 * (i.e., the set of unsynced data changes due to a success or new user-made changes.)
 */
export const PushDispatcher = () => {
  /* Determined whether the user is logged in before doing anything. */
  const isLoggedIn = useIsLoggedIn();

  /* Debounce unsynced IDs so we have a stable state when queuing up a push */
  const unsyncedSiteIds = useDebouncedUnsyncedSiteIds();

  /* Also debounce offline state so we know when it's safe to attempt a push. */
  const isOffline = useDebouncedIsOffline();

  /*A push is needed when the user is logged in, not offline, and has unsynced data. */
  const needsPush = isLoggedIn && !isOffline && unsyncedSiteIds.length > 0;

  /* Set up a callback for the dispatcher to use when it determines a push is required. */
  const dispatchPush = usePushDispatch(unsyncedSiteIds);

  /* Set up retry mechanism (an Interval handle + callbacks to begin and clear it) */
  const {beginRetry, clearRetry} = useRetryInterval(dispatchPush);

  useEffect(() => {
    /* Dispatch a push if needed */
    if (needsPush) {
      dispatchPush()
        /* If the initial push failed, begin a retry cycle */
        .then(result => {
          if (!result.payload || 'error' in result.payload) {
            beginRetry();
          }
        })
        .catch(beginRetry);
    }

    /* Cancel any pending retries when push input changes or component unmounts */
    return clearRetry;
  }, [needsPush, dispatchPush, beginRetry, clearRetry]);

  return <></>;
};

export const usePushDispatch = (siteIds: string[]) => {
  const dispatch = useDispatch();
  return useCallback(() => {
    return dispatch(pushSoilData(siteIds));
  }, [dispatch, siteIds]);
};

export const useIsLoggedIn = () => {
  return useSelector(state => !!state.account.currentUser.data);
};

export const useDebouncedIsOffline = () => {
  const [isOffline] = useDebounce(useIsOffline(), PUSH_DEBOUNCE_MS);
  return isOffline;
};

export const useDebouncedUnsyncedSiteIds = () => {
  const [unsyncedSiteIds] = useDebounce(
    useSelector(selectUnsyncedSiteIds),
    PUSH_DEBOUNCE_MS,
  );
  return unsyncedSiteIds;
};

export const useRetryInterval = (action: () => void) => {
  /*
   * Note that we are using a React ref to keep a stable input value for other hooks.
   * (If we just used a state, we'd have extra re-renders when clearing or initializing
   * a retry, which would complicate the logic needed to cancel retries.)
   */
  const handle = useRef(undefined as number | undefined);

  const clearRetry = useCallback(() => {
    if (handle.current !== undefined) {
      clearInterval(handle.current);
      handle.current = undefined;
    }
  }, [handle]);

  const beginRetry = useCallback(() => {
    /* Clear any ongoing retry cycles before beginning a new one */
    clearRetry();
    handle.current = setInterval(action, PUSH_RETRY_INTERVAL_MS);
  }, [clearRetry, handle, action]);

  return {beginRetry, clearRetry};
};
