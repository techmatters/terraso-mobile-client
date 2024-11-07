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
  const dispatch = useDispatch();

  /* Debounce unsynced IDs so we have a stable state before queuing up a push */
  const [unsyncedSiteIds] = useDebounce(
    useSelector(selectUnsyncedSiteIds),
    PUSH_DEBOUNCE_MS,
  );
  const dispatchPush = useCallback(() => {
    return dispatch(pushSoilData(unsyncedSiteIds));
  }, [dispatch, unsyncedSiteIds]);

  /*
   * Also debounce offline state so we know when it's safe to attempt a push
   * (We need to push if there is a logged-in user, we are online, and we have unsynced site IDs)
   */
  const currentUser = useSelector(state => state.account.currentUser.data);
  const [isOffline] = useDebounce(useIsOffline(), PUSH_DEBOUNCE_MS);
  const needsPush = currentUser && !isOffline && unsyncedSiteIds.length > 0;

  /*
   * Set up retry mechanism (an Interval handle + callbacks to begin and clear it)
   *
   * Note that we are using a React ref to keep a stable input value to side-effects.
   * (If we just used a state, we'd have extra re-renders when clearing or initializing
   * a retry, which would complicate the logic needed to cancel retries.)
   */
  const retryIntervalHandle = useRef(undefined as number | undefined);
  const clearRetry = useCallback(() => {
    if (retryIntervalHandle.current !== undefined) {
      clearInterval(retryIntervalHandle.current);
      retryIntervalHandle.current = undefined;
    }
  }, [retryIntervalHandle]);
  const beginRetry = useCallback(() => {
    /* Clear any ongoing retry cycles before beginning a new one */
    clearRetry();
    retryIntervalHandle.current = setInterval(
      dispatchPush,
      PUSH_RETRY_INTERVAL_MS,
    );
  }, [clearRetry, retryIntervalHandle, dispatchPush]);

  useEffect(() => {
    /* Dispatch an initial push if needed */
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
