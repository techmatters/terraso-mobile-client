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
import {fetchAllExportTokens} from 'terraso-mobile-client/model/export/exportSlice';
import {fetchSoilDataForUser} from 'terraso-mobile-client/model/soilData/soilDataGlobalReducer';
import {
  selectSyncErrorSiteIds,
  selectUnsyncedSiteIds,
} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {pushSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

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
  return useSelector(selectSyncErrorSiteIds);
};

export const usePullDispatch = () => {
  const dispatch = useDispatch();

  return useCallback(
    async (currentUserID: string) => {
      // Fetch all data in parallel
      // If the pull failed, do nothing. Another pull will happen eventually.
      await Promise.all([
        dispatch(fetchSoilDataForUser(currentUserID)),
        dispatch(fetchAllExportTokens()),
      ]);
    },
    [dispatch],
  );
};
