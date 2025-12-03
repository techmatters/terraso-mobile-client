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

export const selectSoilMetadata = (siteId: string) => (state: AppState) =>
  state.soilMetadata.soilMetadata[siteId] ?? {};

export const selectUserRatingsMetadata = (siteId?: string) => {
  return (state: AppState) =>
    siteId ? state.soilMetadata.soilMetadata[siteId]?.userRatings : undefined;
};

export const selectSoilMetadataChanges = (state: AppState) =>
  state.soilMetadata.soilMetadataSync;

// Future work: Much of the sync logic for soilMetadata and soilData is duplicated. When we add another entity, it would be good to refactor to reduce duplication in various files (in here, the slices, pushUtils files, perhaps in the pushUserData mutation and associated action, etc.)
export const selectUnsyncedMetadataSiteIds = createSelector(
  selectSoilMetadataChanges,
  records => Object.keys(getUnsyncedRecords(records)).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);

export const selectMetadataSyncErrorSiteIds = createSelector(
  selectSoilMetadataChanges,
  records => Object.keys(getErrorRecords(records)).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);
