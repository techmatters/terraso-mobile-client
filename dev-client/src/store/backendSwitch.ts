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

import {debugEnabled, ENV_CONFIG} from 'terraso-mobile-client/config';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import type {AppDispatch} from 'terraso-mobile-client/store';
import {performLogout} from 'terraso-mobile-client/store/performLogout';

// MMKV key holding the TERRASO_BACKEND the currently-cached data came from.
// Kept separate from 'persisted-redux-state' and the auth tokens so it
// survives the logout wipe.
const LAST_BACKEND_KEY = 'last-backend-url';

/**
 * Cached app data and auth tokens are only valid against the backend they came
 * from. When TERRASO_BACKEND differs from the value stored on the previous
 * launch, log the user out to flush the stale data. Intentionally ignores
 * unsynced changes: data from server A is meaningless on server B.
 *
 * A first launch with nothing stored only records the current backend as the
 * baseline — it does NOT log out. We don't want to force every existing user
 * to sign in again, and in practice only internal builds ever switch backends;
 * external users stay on one server.
 *
 * Run once at startup, right after the store is created.
 */
export const flushDataIfBackendChanged = (dispatch: AppDispatch) => {
  const current = ENV_CONFIG.TERRASO_BACKEND as string | undefined;
  if (!current) {
    return;
  }
  const last = kvStorage.getString(LAST_BACKEND_KEY);
  if (last === current) {
    return;
  }

  // Record the new backend as the baseline for next launch. Done whether or not
  // we log out, so a later real switch is still detected after a first launch.
  kvStorage.setString(LAST_BACKEND_KEY, current);

  // Only flush when there was a previous backend to differ from; a first launch
  // (nothing stored) must not log anyone out.
  if (last !== undefined) {
    performLogout(dispatch);
    if (debugEnabled) {
      console.log(
        `[backend-switch] backend ${last} → ${current}; ` +
          'logged out to flush local data',
      );
    }
  }
};
