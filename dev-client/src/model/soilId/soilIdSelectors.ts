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

import {SoilDataPushFailureReason} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilData, SoilIdKey} from 'terraso-client-shared/soilId/soilIdTypes';

import {SoilIdEntry} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {
  ChangeRecords,
  getUnsyncedRecords,
} from 'terraso-mobile-client/model/sync/sync';
import {AppState} from 'terraso-mobile-client/store';

export const selectSoilIdMatches =
  (key: SoilIdKey) =>
  (state: AppState): SoilIdEntry | undefined =>
    state.soilId.matches[key];

export const selectUnsyncedSites = (
  state: AppState,
): ChangeRecords<SoilData, SoilDataPushFailureReason> =>
  getUnsyncedRecords(state.soilId.soilChanges);

export const selectUnsyncedSiteIds = createSelector(
  selectUnsyncedSites,
  records => Object.keys(records),
);

export const selectHasSyncErrors = createSelector(
  selectUnsyncedSites,
  records =>
    !!Object.values(records).find(
      record => record.lastSyncedError !== undefined,
    ),
);
