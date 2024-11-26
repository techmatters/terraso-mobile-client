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

import {useCallback, useRef} from 'react';

import {useDebounce} from 'use-debounce';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {fetchSoilDataForUser} from 'terraso-mobile-client/model/soilId/soilIdGlobalReducer';
import {
  selectSyncErrorSites,
  selectUnsyncedSiteIds,
} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {pushSoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectCurrentUserID} from 'terraso-mobile-client/store/selectors';

export const useIsLoggedIn = () => {
  return useSelector(state => !!state.account.currentUser.data);
};

export const useDebouncedIsOffline = (interval: number) => {
  const [isOffline] = useDebounce(useIsOffline(), interval);
  return isOffline;
};

export const useDebouncedUnsyncedSiteIds = (interval: number) => {
  const [unsyncedSiteIds] = useDebounce(
    useSelector(selectUnsyncedSiteIds),
    interval,
  );
  return unsyncedSiteIds;
};

export const usePushDispatch = (siteIds: string[]) => {
  const dispatch = useDispatch();
  return useCallback(() => {
    return dispatch(pushSoilData(siteIds));
  }, [dispatch, siteIds]);
};

export const useRetryInterval = (interval: number, action: () => void) => {
  /*
   * Note that we are using a React ref to keep a stable input value for other hooks.
   * (If we just used a state, we'd have extra re-renders when clearing or initializing
   * a retry, which would complicate the logic needed to cancel retries.)
   */
  const handle = useRef(undefined as number | undefined);

  const endRetry = useCallback(() => {
    if (handle.current !== undefined) {
      clearInterval(handle.current);
      handle.current = undefined;
    }
  }, [handle]);

  const beginRetry = useCallback(() => {
    /* Clear any ongoing retry cycles before beginning a new one */
    endRetry();
    handle.current = setInterval(action, interval);
  }, [endRetry, handle, action, interval]);

  return {beginRetry, endRetry};
};

export const useSyncErrorSiteIds = () => {
  return Object.keys(useSelector(selectSyncErrorSites));
};

export const usePullDispatch = () => {
  const dispatch = useDispatch();

  const currentUserID = useSelector(selectCurrentUserID);

  return useCallback(() => {
    if (currentUserID !== undefined) {
      dispatch(setPullRequested(false));
      // If the pull failed, do nothing. Another pull will happen eventually.
      return dispatch(fetchSoilDataForUser(currentUserID));
    }
  }, [dispatch, currentUserID]);
};
