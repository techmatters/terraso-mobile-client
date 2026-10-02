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

import Constants from 'expo-constants';

import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import type {AppDispatch} from 'terraso-mobile-client/store';
import {performLogout} from 'terraso-mobile-client/store/performLogout';

// MMKV key holding the TERRASO_BACKEND the currently-cached data came from.
// Kept separate from 'persisted-redux-state' and the auth tokens so it
// survives the logout wipe.
const LAST_BACKEND_KEY = 'last-backend-url';

/**
 * Cached app data and auth tokens are only valid against the backend they came
 * from. When TERRASO_BACKEND differs from the value seen on the previous launch
 * — including the first launch after this check shipped, where nothing is
 * stored — log the user out to flush the stale data. Intentionally ignores
 * unsynced changes: data from server A is meaningless on server B.
 *
 * Run once at startup, right after the store is created.
 */
export const flushDataIfBackendChanged = (dispatch: AppDispatch) => {
  const current = Constants.expoConfig?.extra?.TERRASO_BACKEND as
    | string
    | undefined;
  if (!current) {
    return;
  }
  const last = kvStorage.getString(LAST_BACKEND_KEY);
  if (last !== current) {
    performLogout(dispatch);
    kvStorage.setString(LAST_BACKEND_KEY, current);
    console.log(
      `[backend-switch] backend ${last ?? '(none)'} → ${current}; ` +
        'logged out to flush local data',
    );
  }
};
