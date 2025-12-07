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

import {userLoggedOut} from 'terraso-mobile-client/store/logoutActions';
import {
  createGlobalReducer,
  rootReducer,
} from 'terraso-mobile-client/store/reducers';

/**
 * Global reducer that resets all state to initial values on logout.
 *
 * This ensures that when a user logs out and a different user logs in,
 * the new user starts with a clean state (same as a fresh app install).
 */
export const logoutReducer = createGlobalReducer(builder => {
  builder.addCase(userLoggedOut, () => {
    return rootReducer(undefined, {type: ''});
  });
});
