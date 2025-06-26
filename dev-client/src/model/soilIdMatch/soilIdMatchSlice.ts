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

import {createSlice, Draft} from '@reduxjs/toolkit';

import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import * as soilIdActions from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchActions';
import {
  CoordsKey,
  coordsKey,
  flushErrorEntries,
  siteEntryForStatus,
  SoilIdEntry,
  tempLocationEntryForStatus,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

export type SoilState = {
  locationBasedMatches: Record<CoordsKey, SoilIdEntry>;

  // FYI: All site soil matches go here, even if there's no collected site data (and therefore no data match score)
  siteDataBasedMatches: Record<string, SoilIdEntry>;
};

export const initialState: SoilState = {
  locationBasedMatches: {},
  siteDataBasedMatches: {},
};

export const deleteSiteMatches = (
  state: Draft<SoilState>,
  siteIds: string[],
) => {
  for (const siteId of siteIds) {
    delete state.siteDataBasedMatches[siteId];
  }
};

const soilIdMatchSlice = createSlice({
  name: 'soilIdMatch',
  initialState,
  reducers: {
    flushLocationCache: state => {
      state.locationBasedMatches = {};
    },
    flushDataCacheErrors: state => {
      flushErrorEntries(state.siteDataBasedMatches);
    },
  },
  extraReducers: builder => {
    builder.addCase(
      fetchTempLocationBasedSoilMatches.pending,
      (state, action) => {
        const coords = action.meta.arg;
        const key = coordsKey(coords);
        state.locationBasedMatches[key] = tempLocationEntryForStatus(
          coords,
          'loading',
        );
      },
    );

    builder.addCase(
      fetchTempLocationBasedSoilMatches.rejected,
      (state, action) => {
        const coords = action.meta.arg;
        const key = coordsKey(coords);
        state.locationBasedMatches[key] = tempLocationEntryForStatus(
          coords,
          'error',
        );
      },
    );

    builder.addCase(
      fetchTempLocationBasedSoilMatches.fulfilled,
      (state, action) => {
        const key = coordsKey(action.meta.arg);
        state.locationBasedMatches[key] = action.payload;
      },
    );

    builder.addCase(fetchSiteBasedSoilMatches.pending, (state, action) => {
      const siteId = action.meta.arg.siteId;
      const input = action.meta.arg.input;
      state.siteDataBasedMatches[siteId] = siteEntryForStatus(input, 'loading');
    });

    builder.addCase(fetchSiteBasedSoilMatches.rejected, (state, action) => {
      const siteId = action.meta.arg.siteId;
      const input = action.meta.arg.input;
      state.siteDataBasedMatches[siteId] = siteEntryForStatus(input, 'error');
    });

    builder.addCase(fetchSiteBasedSoilMatches.fulfilled, (state, action) => {
      const siteId = action.meta.arg.siteId;
      state.siteDataBasedMatches[siteId] = action.payload;
    });
  },
});

export const {flushLocationCache, flushDataCacheErrors} =
  soilIdMatchSlice.actions;

export const fetchTempLocationBasedSoilMatches = createAsyncThunk(
  'soilId/fetchLocationBasedSoilMatches',
  soilIdActions.fetchTempLocationBasedSoilMatchesThunk,
);

export const fetchSiteBasedSoilMatches = createAsyncThunk(
  'soilId/fetchDataBasedSoilMatches',
  soilIdActions.fetchSiteBasedSoilMatchesThunk,
);

export default soilIdMatchSlice.reducer;
