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

import {shallowEqual} from 'react-redux';

import {createSelector} from '@reduxjs/toolkit';

import {
  getErrorRecords,
  getUnsyncedRecords,
} from 'terraso-mobile-client/model/sync/records';
import {AppState} from 'terraso-mobile-client/store';

export const selectSiteChanges = (state: AppState) => state.site.siteSync;

export const selectUnsyncedSiteSiteIds = createSelector(
  selectSiteChanges,
  records => Object.keys(getUnsyncedRecords(records)).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);

export const selectSiteSyncErrorSiteIds = createSelector(
  selectSiteChanges,
  records => Object.keys(getErrorRecords(records)).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);

export const selectNoteChanges = (state: AppState) => state.site.noteSync;

export const selectUnsyncedNoteIds = createSelector(
  selectNoteChanges,
  records => Object.keys(getUnsyncedRecords(records)).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);

export const selectNoteSyncErrorNoteIds = createSelector(
  selectNoteChanges,
  records => Object.keys(getErrorRecords(records)).sort(),
  {
    memoizeOptions: {
      resultEqualityCheck: shallowEqual,
    },
  },
);
