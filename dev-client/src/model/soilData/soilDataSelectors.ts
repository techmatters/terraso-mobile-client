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

import {shallowEqual} from 'react-redux';

import {createSelector} from '@reduxjs/toolkit';

import {
  getErrorRecords,
  getUnsyncedRecords,
} from 'terraso-mobile-client/model/sync/records';
import {AppState} from 'terraso-mobile-client/store';

export const selectSoilChanges = (state: AppState) => state.soilData.soilSync;

/*
 * Note: selectors that derive new values from change records are memoized to ensure
 * stable values between renders. (If derived values are not stable, we can have unexpected
 * results for downstream consumers, in particular for side-effect dependencies.)
 *
 * (see https://redux.js.org/usage/deriving-data-selectors#optimizing-selectors-with-memoization)
 */

// Note: if you use in dependency lists, this returns a new object every time
export const selectUnsyncedSoilDataSites = createSelector(
  selectSoilChanges,
  records => getUnsyncedRecords(records),
);

export const selectUnsyncedSoilDataSiteIds = createSelector(
  selectUnsyncedSoilDataSites,
  records => Object.keys(records).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);

// Note: if you use in dependency lists, this returns a new object every time
export const selectSoilDataSyncErrorSites = createSelector(
  selectSoilChanges,
  getErrorRecords,
);

export const selectSoilDataSyncErrorSiteIds = createSelector(
  selectSoilDataSyncErrorSites,
  errorSites => Object.keys(errorSites).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);
