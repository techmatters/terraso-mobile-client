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

import {createSlice, Draft, PayloadAction} from '@reduxjs/toolkit';

import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import * as soilIdActions from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchActions';
import {
  CoordsKey,
  coordsKey,
  dataEntryForStatus,
  locationEntryForStatus,
  SoilIdDataEntry,
  SoilIdLocationEntry,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

export type SoilState = {
  // don't persist location-based matches to disk??
  // split metadata into own module

  locationBasedMatches: Record<CoordsKey, SoilIdLocationEntry>;
  siteDataBasedMatches: Record<string, SoilIdDataEntry>;
};

export const initialState: SoilState = {
  locationBasedMatches: {},
  siteDataBasedMatches: {},
};

export const deleteSoilData = (state: Draft<SoilState>, siteIds: string[]) => {
  for (const siteId of siteIds) {
    delete state.siteDataBasedMatches[siteId];
  }
};

const soilIdMatchSlice = createSlice({
  name: 'soilIdMatch',
  initialState,
  reducers: {
    flushSiteDataBasedMatches: (state, action: PayloadAction<string>) => {
      const siteId = action.payload;
      delete state.siteDataBasedMatches[siteId];
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchLocationBasedSoilMatches.pending, (state, action) => {
      const key = coordsKey(action.meta.arg);
      state.locationBasedMatches[key] = locationEntryForStatus('loading');
    });

    builder.addCase(fetchLocationBasedSoilMatches.rejected, (state, action) => {
      const key = coordsKey(action.meta.arg);
      state.locationBasedMatches[key] = locationEntryForStatus('error');
    });

    builder.addCase(
      fetchLocationBasedSoilMatches.fulfilled,
      (state, action) => {
        const key = coordsKey(action.meta.arg);
        state.locationBasedMatches[key] = action.payload;
      },
    );

    builder.addCase(fetchSiteDataBasedSoilMatches.pending, (state, action) => {
      const siteId = action.meta.arg.siteId;
      const input = action.meta.arg.input;
      state.siteDataBasedMatches[siteId] = dataEntryForStatus(input, 'loading');
    });

    builder.addCase(fetchSiteDataBasedSoilMatches.rejected, (state, action) => {
      const siteId = action.meta.arg.siteId;
      const input = action.meta.arg.input;
      state.siteDataBasedMatches[siteId] = dataEntryForStatus(input, 'error');
    });

    builder.addCase(
      fetchSiteDataBasedSoilMatches.fulfilled,
      (state, action) => {
        const siteId = action.meta.arg.siteId;
        state.siteDataBasedMatches[siteId] = action.payload;
      },
    );
  },
});

export const {flushSiteDataBasedMatches} = soilIdMatchSlice.actions;

export const fetchLocationBasedSoilMatches = createAsyncThunk(
  'soilId/fetchLocationBasedSoilMatches',
  soilIdActions.fetchLocationBasedSoilMatchesThunk,
);

export const fetchSiteDataBasedSoilMatches = createAsyncThunk(
  'soilId/fetchDataBasedSoilMatches',
  soilIdActions.fetchSiteDataBasedSoilMatchesThunk,
);

export default soilIdMatchSlice.reducer;
