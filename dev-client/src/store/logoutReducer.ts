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

import {initialState as elevationInitialState} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {initialState as projectInitialState} from 'terraso-mobile-client/model/project/projectSlice';
import {initialState as siteInitialState} from 'terraso-mobile-client/model/site/siteSlice';
import {initialState as soilDataInitialState} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {initialState as soilIdMatchInitialState} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {initialState as soilMetadataInitialState} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import {initialState as syncInitialState} from 'terraso-mobile-client/model/sync/syncSlice';
import {userLoggedOut} from 'terraso-mobile-client/store/logoutActions';
import {createGlobalReducer} from 'terraso-mobile-client/store/reducers';

/**
 * Global reducer that resets all user-specific state to initial values on logout.
 *
 * This ensures that when a user logs out and a different user logs in,
 * the new user doesn't see stale data from the previous user.
 *
 * State that is reset:
 * - site: User's sites
 * - project: User's projects
 * - soilData: Soil data for sites
 * - soilMetadata: Soil metadata (selections, ratings)
 * - soilIdMatch: Soil ID match results
 * - sync: Sync state
 * - elevation: Elevation data cache
 *
 * State that is preserved:
 * - preferences: UI preferences (color workflow, etc.) - these are app settings
 * - map: Map view state - this is UI state, not user data
 * - account: Handled by shared signOut action
 * - notifications: Handled by shared signOut action
 */
export const logoutReducer = createGlobalReducer(builder => {
  builder.addCase(userLoggedOut, state => {
    // Reset all user-specific state to initial values
    state.site = siteInitialState;
    state.project = projectInitialState;
    state.soilData = soilDataInitialState;
    state.soilMetadata = soilMetadataInitialState;
    state.soilIdMatch = soilIdMatchInitialState;
    state.sync = syncInitialState;
    state.elevation = elevationInitialState;

    // Preserve preferences (UI settings like color workflow)
    // These are app-level settings, not user data
    // state.preferences is NOT reset

    // Preserve map state (last map view position)
    // This is UI state, not user data
    // state.map is NOT reset

    // account and notifications are handled by the shared signOut action
  });
});
