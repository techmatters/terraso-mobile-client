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
import {useSelector} from 'react-redux';

import {PayloadAction} from '@reduxjs/toolkit';

import {trackPushResults} from 'terraso-mobile-client/analytics/syncErrorTracking';
import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {useSyncNotificationContext} from 'terraso-mobile-client/context/SyncNotificationContext';
import type {PushUserDataResults} from 'terraso-mobile-client/model/sync/actions/syncActions';
import {SyncResults} from 'terraso-mobile-client/model/sync/results';
import {AppState} from 'terraso-mobile-client/store';
import {
  useDebouncedIsOffline,
  useDebouncedUnsyncedMetadataSiteIds,
  useDebouncedUnsyncedSiteSiteIds,
  useDebouncedUnsyncedSoilDataSiteIds,
  useIsLoggedIn,
  usePushDispatch,
  useRetryInterval,
} from 'terraso-mobile-client/store/sync/hooks/syncHooks';

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
  /* Determine whether the user is logged in before doing anything. */
  const isLoggedIn = useIsLoggedIn();
  const sites = useSelector((state: AppState) => state.site.sites);
  const sitesRef = useRef(sites);
  sitesRef.current = sites;

  /* Use notifications to show errors to the user */
  const syncNotifications = useSyncNotificationContext();

  /* Debounce offline state so we know when it's safe to attempt a push. */
  const isOffline = useDebouncedIsOffline(PUSH_DEBOUNCE_MS);

  /* Also debounce unsynced IDs so we have a stable state when queuing up a push */
  const unsyncedSoilDataIds =
    useDebouncedUnsyncedSoilDataSiteIds(PUSH_DEBOUNCE_MS);
  const unsyncedMetadataIds =
    useDebouncedUnsyncedMetadataSiteIds(PUSH_DEBOUNCE_MS);
  const unsyncedSiteIds = useDebouncedUnsyncedSiteSiteIds(PUSH_DEBOUNCE_MS);

  /* Set up a callback for the dispatcher to use when it determines a push is needed. */
  const dispatchPushBase = usePushDispatch({
    soilDataSiteIds: unsyncedSoilDataIds,
    soilMetadataSiteIds: unsyncedMetadataIds,
    siteSiteIds: unsyncedSiteIds,
  });

  /* Connect the push dispatch to sync error notifications */
  const dispatchPush = useCallback(
    () =>
      dispatchPushBase().then(result => {
        /* Note: We use `siteRefs` instead of `sites` because we don't want it to be reactive here. Otherwise we'd re-create this function, which would re-run the useEffect that does the push */
        const hasErrors = trackPushResults(
          result.payload as PushUserDataResults,
          siteId => sitesRef.current[siteId]?.name ?? siteId,
        );
        if (hasErrors) {
          syncNotifications.showError({reason: 'push'});
        }
        return result;
      }),
    [dispatchPushBase, syncNotifications],
  );

  /* A push is needed when the user is logged in, not offline, and has unsynced data. */
  const needsPush =
    isLoggedIn &&
    !isOffline &&
    (unsyncedSoilDataIds.length > 0 ||
      unsyncedMetadataIds.length > 0 ||
      unsyncedSiteIds.length > 0);

  /* Set up retry mechanism which will dispatch the push action when it begins. */
  const {beginRetry, endRetry} = useRetryInterval(
    PUSH_RETRY_INTERVAL_MS,
    dispatchPush,
  );

  useEffect(() => {
    /* Dispatch a push if needed */
    if (needsPush) {
      if (syncDebugEnabled) {
        console.log(
          '⬆️ PushDispatcher: pushing',
          unsyncedSoilDataIds.length,
          'soilData,',
          unsyncedMetadataIds.length,
          'metadata,',
          unsyncedSiteIds.length,
          'sites',
        );
      }
      dispatchPush()
        .then(result => {
          if (dispatchFailed(result)) {
            if (syncDebugEnabled) {
              console.log('⬆️ PushDispatcher: push failed, starting retry');
            }
            beginRetry();
          }
        })
        .catch(err => {
          console.error('⬆️ PushDispatcher: push error, starting retry', err);
          beginRetry();
        });
    }

    /* Cancel any pending retries when push input changes or component unmounts */
    return endRetry;
  }, [
    needsPush,
    dispatchPush,
    beginRetry,
    endRetry,
    unsyncedSoilDataIds,
    unsyncedMetadataIds,
    unsyncedSiteIds,
  ]);

  return <></>;
};

const dispatchFailed = (
  result: PayloadAction<undefined | object | SyncResults<unknown, unknown>>,
) => {
  return !result.payload || 'error' in result.payload;
};
