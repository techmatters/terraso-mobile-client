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

import {signOut} from 'terraso-client-shared/account/accountSlice';

import type {AppDispatch} from 'terraso-mobile-client/store';
import {userLoggedOut} from 'terraso-mobile-client/store/logoutActions';

/**
 * Perform a full logout: reset and clear all persisted Redux state (via
 * `userLoggedOut`, which the persistence middleware turns into an MMKV wipe of
 * the cached app data) plus clear the auth tokens (via the shared `signOut`).
 * Shared by the sign-out UI and the automatic flush that runs when the backend
 * server changes. There is no unsynced-changes guard here — that is a UI-only
 * concern in SignOutModal — so callers that must flush unconditionally (e.g. a
 * backend switch) can call this directly.
 *
 * Kept in its own module (not logoutActions.ts) so importing the logout action
 * doesn't transitively pull in the shared accountSlice, whose module-load code
 * requires the Terraso API to already be configured.
 */
export const performLogout = (dispatch: AppDispatch) => {
  dispatch(userLoggedOut());
  dispatch(signOut());
};
