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

import {useEffect, useRef} from 'react';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {useAppState} from 'terraso-mobile-client/hooks/appStateHooks';
import {isInternalAccount} from 'terraso-mobile-client/model/sync/internalAccounts';
import {reanchorUserData} from 'terraso-mobile-client/model/sync/reanchorThunk';
import {selectReanchorPending} from 'terraso-mobile-client/model/sync/syncSelectors';
import {
  setReanchorDone,
  setReanchorPending,
} from 'terraso-mobile-client/model/sync/syncSlice';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  selectCurrentUserEmail,
  selectCurrentUserID,
} from 'terraso-mobile-client/store/selectors';
import {useDebouncedIsOffline} from 'terraso-mobile-client/store/sync/hooks/syncHooks';
import {OFFLINE_DEBOUNCE_MS} from 'terraso-mobile-client/store/sync/PullRequester';

// Persisted flag (survives the logout wipe, like backendSwitch's key) marking
// that the one-time re-anchor to prod has completed for this install.
export const PROD_REANCHOR_DONE_KEY = 'prod-reanchor-done';

/*
 * Runs the one-time "re-anchor to prod" (see reanchorThunk / docs). On the
 * first authenticated, online foreground moment after installing this build, it
 * fetches prod's data and rewrites sync records so local edits prod is missing
 * or has stale get pushed. It blocks the normal pull (via `reanchorPending`)
 * until it finishes so the pull can't clobber those edits first. Guarded by a
 * persisted flag so it runs at most once per install; on failure the flag is
 * left unset so it retries on the next launch.
 */
export const ReanchorDispatcher = () => {
  const dispatch = useDispatch();
  const currentUserID = useSelector(selectCurrentUserID);
  const currentUserEmail = useSelector(selectCurrentUserEmail);
  const isOffline = useDebouncedIsOffline(OFFLINE_DEBOUNCE_MS);
  const appState = useAppState();
  const reanchorPending = useSelector(selectReanchorPending);
  const [reanchorDone, setDoneFlag] = kvStorage.useBool(
    PROD_REANCHOR_DONE_KEY,
    false,
  );

  // Guards against re-dispatching across the renders that happen between
  // setting `reanchorPending` and the thunk resolving.
  const inProgress = useRef(false);

  useEffect(() => {
    if (currentUserID === undefined || reanchorDone) {
      return;
    }

    // Internal/staff accounts are excluded: their staging-only test data must
    // never be pushed to prod. Mark done so the re-anchor is permanently
    // skipped for them (no fetch, no push).
    if (isInternalAccount(currentUserEmail)) {
      if (syncDebugEnabled) {
        console.log(
          '🔁 re-anchor: internal account → skipping (no fetch/push)',
        );
      }
      setDoneFlag(true);
      dispatch(setReanchorDone(true));
      return;
    }

    const canRun =
      !isOffline &&
      appState === 'active' &&
      !reanchorPending &&
      !inProgress.current;
    if (!canRun) {
      return;
    }

    inProgress.current = true;
    if (syncDebugEnabled) {
      console.log('🔁 re-anchor: fetching prod data for', currentUserID);
    }
    dispatch(setReanchorPending(true));
    dispatch(reanchorUserData(currentUserID))
      .then(action => {
        // Only mark done on success; a failure leaves the flag unset so the
        // re-anchor retries on the next launch.
        if (reanchorUserData.fulfilled.match(action)) {
          setDoneFlag(true);
          dispatch(setReanchorDone(true));
          if (syncDebugEnabled) {
            console.log(
              '🔁 re-anchor: complete (push now flushes any marked records)',
            );
          }
        } else if (syncDebugEnabled) {
          console.log('🔁 re-anchor: fetch failed → will retry next launch');
        }
      })
      .finally(() => {
        // Cleared after the fulfilled reducer has already dirtied the records,
        // so the pull stays blocked (now on unsynced count) until the push runs.
        dispatch(setReanchorPending(false));
        inProgress.current = false;
      });
  }, [
    currentUserID,
    currentUserEmail,
    isOffline,
    appState,
    reanchorDone,
    reanchorPending,
    dispatch,
    setDoneFlag,
  ]);

  return <></>;
};
