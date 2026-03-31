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

import {useCallback, useMemo, useRef} from 'react';

import {useDebounce} from 'use-debounce';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {
  selectNoteSyncErrorNoteIds,
  selectSiteSyncErrorSiteIds,
  selectUnsyncedNoteIds,
  selectUnsyncedSiteSiteIds,
} from 'terraso-mobile-client/model/site/siteSelectors';
import {
  selectSoilDataSyncErrorSiteIds,
  selectUnsyncedSoilDataSiteIds,
} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {
  selectMetadataSyncErrorSiteIds,
  selectUnsyncedMetadataSiteIds,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {
  pullUserData,
  pushUserData,
} from 'terraso-mobile-client/model/sync/syncGlobalReducer';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const useIsLoggedIn = () => {
  return useSelector(state => !!state.account.currentUser.data);
};

export const useDebouncedIsOffline = (interval: number) => {
  const [isOffline] = useDebounce(useIsOffline(), interval);
  return isOffline;
};

export const useDebouncedUnsyncedSoilDataSiteIds = (interval: number) => {
  const [unsyncedSoilDataSiteIds] = useDebounce(
    useSelector(selectUnsyncedSoilDataSiteIds),
    interval,
  );
  return unsyncedSoilDataSiteIds;
};

export const useDebouncedUnsyncedMetadataSiteIds = (interval: number) => {
  const [unsyncedMetadataSiteIds] = useDebounce(
    useSelector(selectUnsyncedMetadataSiteIds),
    interval,
  );
  return unsyncedMetadataSiteIds;
};

export const useDebouncedUnsyncedSiteSiteIds = (interval: number) => {
  const [unsyncedSiteIds] = useDebounce(
    useSelector(selectUnsyncedSiteSiteIds),
    interval,
  );
  return unsyncedSiteIds;
};

export const useDebouncedUnsyncedNoteIds = (interval: number) => {
  const [unsyncedNoteIds] = useDebounce(
    useSelector(selectUnsyncedNoteIds),
    interval,
  );
  return unsyncedNoteIds;
};

type PushDispatchInputs = {
  soilDataSiteIds: string[];
  soilMetadataSiteIds: string[];
  siteSiteIds: string[];
  noteIds: string[];
};
export const usePushDispatch = ({
  soilDataSiteIds,
  soilMetadataSiteIds,
  siteSiteIds,
  noteIds,
}: PushDispatchInputs) => {
  const dispatch = useDispatch();
  return useCallback(() => {
    // Pass separate arrays to avoid fetching unnecessary sync records
    return dispatch(
      pushUserData({
        soilDataSiteIds,
        soilMetadataSiteIds,
        siteSiteIds,
        noteIds,
      }),
    );
  }, [dispatch, soilDataSiteIds, soilMetadataSiteIds, siteSiteIds, noteIds]);
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

// Site ids with either data or metadata that is unsynced (no duplicates)
export const useUnsyncedSiteIds = () => {
  const unsyncedSoilDataSiteIds = useSelector(selectUnsyncedSoilDataSiteIds);
  const unsyncedMetadataSiteIds = useSelector(selectUnsyncedMetadataSiteIds);
  const unsyncedSiteSiteIds = useSelector(selectUnsyncedSiteSiteIds);
  const unsyncedNoteIds = useSelector(selectUnsyncedNoteIds);
  const unsyncedCombinedSiteIds = useMemo(() => {
    return [
      ...new Set([
        ...unsyncedSoilDataSiteIds,
        ...unsyncedMetadataSiteIds,
        ...unsyncedSiteSiteIds,
        // Note: noteIds are note IDs not site IDs, but including them
        // ensures the "has unsynced data" indicator triggers
        ...(unsyncedNoteIds.length > 0 ? unsyncedSiteSiteIds : []),
      ]),
    ];
  }, [
    unsyncedSoilDataSiteIds,
    unsyncedMetadataSiteIds,
    unsyncedSiteSiteIds,
    unsyncedNoteIds,
  ]);
  return unsyncedCombinedSiteIds;
};

// Site ids with either data or metadata errors (no duplicates)
export const useSyncErrorSiteIds = () => {
  const soilDataErrorSiteIds = useSelector(selectSoilDataSyncErrorSiteIds);
  const metadataErrorSiteIds = useSelector(selectMetadataSyncErrorSiteIds);
  const siteErrorSiteIds = useSelector(selectSiteSyncErrorSiteIds);
  const noteErrorNoteIds = useSelector(selectNoteSyncErrorNoteIds);
  const combinedErrorSiteIds = useMemo(() => {
    return [
      ...new Set([
        ...soilDataErrorSiteIds,
        ...metadataErrorSiteIds,
        ...siteErrorSiteIds,
        // Note: noteErrorNoteIds are note IDs not site IDs, but including them
        // ensures the error indicator triggers
        ...(noteErrorNoteIds.length > 0 ? siteErrorSiteIds : []),
      ]),
    ];
  }, [
    soilDataErrorSiteIds,
    metadataErrorSiteIds,
    siteErrorSiteIds,
    noteErrorNoteIds,
  ]);
  return combinedErrorSiteIds;
};

export const usePullDispatch = () => {
  const dispatch = useDispatch();

  return useCallback(
    (currentUserID: string) => {
      // If the pull failed, do nothing. Another pull will happen eventually.
      return dispatch(pullUserData(currentUserID));
    },
    [dispatch],
  );
};
