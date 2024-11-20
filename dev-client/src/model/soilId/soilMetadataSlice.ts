/*
 * Copyright © 2023 Technology Matters
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

import {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';
import * as soilMetadataService from 'terraso-client-shared/soilId/soilMetadataService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

export * from 'terraso-client-shared/soilId/soilIdTypes';
export * from 'terraso-mobile-client/model/soilId/soilIdFunctions';

export type SoilState = {
  soilMetadata: Record<string, SoilMetadata | undefined>;
};

export const initialState: SoilState = {
  soilMetadata: {},
};

export const setSoilMetadata = (
  state: Draft<SoilState>,
  soilMetadata: Record<string, SoilMetadata>,
) => {
  state.soilMetadata = soilMetadata;
};

export const deleteSoilMetadata = (
  state: Draft<SoilState>,
  siteIds: string[],
) => {
  for (const siteId of siteIds) {
    delete state.soilMetadata[siteId];
  }
};

const soilMetadataSlice = createSlice({
  name: 'soilMetadata',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(updateSoilMetadata.fulfilled, (state, action) => {
      state.soilMetadata[action.meta.arg.siteId] = action.payload;
    });
  },
});

export const updateSoilMetadata = createAsyncThunk(
  'soilId/updateSoilMetadata',
  soilMetadataService.updateSoilMetadata,
);

export default soilMetadataSlice.reducer;
