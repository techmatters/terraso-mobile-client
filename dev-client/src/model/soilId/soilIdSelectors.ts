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

import {createSelector} from '@reduxjs/toolkit';

import {
  getErrorRecords,
  getUnsyncedRecords,
} from 'terraso-mobile-client/model/sync/records';
import {AppState} from 'terraso-mobile-client/store';

export const selectSoilChanges = (state: AppState) => state.soilId.soilSync;

/*
 * Note: selectors that derive new values from change records are memoized to ensure
 * stable values between renders. (If derived values are not stable, we can have unexpected
 * results for downstream consumers, in particular for side-effect dependencies.)
 *
 * (see https://redux.js.org/usage/deriving-data-selectors#optimizing-selectors-with-memoization)
 */
export const selectUnsyncedSites = createSelector(selectSoilChanges, records =>
  getUnsyncedRecords(records),
);

export const selectUnsyncedSiteIds = createSelector(
  selectUnsyncedSites,
  records => Object.keys(records).sort(),
);

export const selectSyncErrorSites = createSelector(
  selectSoilChanges,
  getErrorRecords,
);

export const selectSyncErrorSiteIds = createSelector(
  selectSyncErrorSites,
  errorSites => Object.keys(errorSites),
);
