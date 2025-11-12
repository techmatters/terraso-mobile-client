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

import {SoilMetadataPushFailureReason} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';
import * as soilMetadataService from 'terraso-client-shared/soilId/soilMetadataService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import * as localSoilMetadata from 'terraso-mobile-client/model/soilMetadata/localSoilMetadataActions';
import {
  markEntityModified,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';

export * from 'terraso-client-shared/soilId/soilIdTypes';
export * from 'terraso-mobile-client/model/soilData/soilDataFunctions';

export type SoilState = {
  /* Note that the keys for these records are the site IDs to which the soil metadata belongs */
  soilMetadata: Record<string, SoilMetadata>;
  soilMetadataSync: SyncRecords<SoilMetadata, SoilMetadataPushFailureReason>;
};

export const initialState: SoilState = {
  soilMetadata: {},
  soilMetadataSync: {},
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
    builder.addCase(localUpdateUserRatings.fulfilled, (state, action) => {
      state.soilMetadata[action.meta.arg.siteId] = action.payload;
      markEntityModified(
        state.soilMetadataSync,
        action.meta.arg.siteId,
        Date.now(),
      );
    });
  },
});

/** @deprecated with FF_select_soil on, use local update followed by global push instead to support offline **/
export const updateSoilMetadata = createAsyncThunk(
  'soilId/updateSoilMetadata',
  soilMetadataService.updateSoilMetadata,
);

export const localUpdateUserRatings = createAsyncThunk(
  'soilId/localUpdateUserRatings',
  localSoilMetadata.updateUserRatingsThunk,
);

export default soilMetadataSlice.reducer;
