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

import {useEffect} from 'react';

import {useAppState} from 'terraso-mobile-client/hooks/appStateHooks';
import {selectPullRequested} from 'terraso-mobile-client/model/sync/syncSelectors';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectCurrentUserID} from 'terraso-mobile-client/store/selectors';
import {
  useDebouncedIsOffline,
  usePullDispatch,
  useUnsyncedSiteIds,
} from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {OFFLINE_DEBOUNCE_MS} from 'terraso-mobile-client/store/sync/PullRequester';

/*
 * Automated system to pull updated data from the server.
 * Listens to if a pull has been requested by PullRequester,
 * and decides if we're ready to actually execute the pull
 */
export const PullDispatcher = () => {
  const dispatch = useDispatch();
  const pullRequested = useSelector(selectPullRequested);

  // Determine whether the user is logged in before doing anything.
  const currentUserID = useSelector(selectCurrentUserID);
  // Debounce offline state so we know when it's safe to attempt a pull.
  const isOffline = useDebouncedIsOffline(OFFLINE_DEBOUNCE_MS);
  // Don't pull when there are changes yet to push.
  const unsyncedSiteIds = useUnsyncedSiteIds();
  // Don't bother pulling when app is not in foreground
  const appState = useAppState();

  const pullAllowed =
    currentUserID !== undefined &&
    !isOffline &&
    unsyncedSiteIds.length === 0 &&
    appState === 'active';

  // TODO-cknipe: Remove these, put in SyncContent?
  console.log('Pull allowed? ', pullAllowed);
  console.log('Pull requested? ', pullRequested);

  // Set up a callback for the dispatcher to use when it determines a pull is needed.
  const dispatchPull = usePullDispatch();

  useEffect(() => {
    if (pullAllowed && pullRequested) {
      // TODO-cknipe: Remove this, put in SyncContent?
      const now = new Date();
      console.log('Doing a pull at ', now.toLocaleTimeString());
      dispatchPull(currentUserID);
      dispatch(setPullRequested(false));
    }
  }, [pullRequested, pullAllowed, dispatchPull, currentUserID, dispatch]);

  return <></>;
};
