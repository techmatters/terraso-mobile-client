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

import {createSlice} from '@reduxjs/toolkit';

import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import * as exportService from 'terraso-mobile-client/model/export/exportService';
import type {ExportToken} from 'terraso-mobile-client/model/export/exportTypes';

export type ExportState = {
  token: ExportToken | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: ExportState = {
  token: null,
  isLoading: false,
  error: null,
};

/**
 * Fetches an export token for a given resource
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 */
export const fetchExportToken = createAsyncThunk(
  'export/fetchExportToken',
  exportService.fetchExportToken,
);

/**
 * Creates a new export token for a given resource
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 */
export const createExportToken = createAsyncThunk(
  'export/createExportToken',
  exportService.createExportToken,
);

/**
 * Deletes an export token
 * @param token - The token to delete
 */
export const deleteExportToken = createAsyncThunk(
  'export/deleteExportToken',
  exportService.deleteExportToken,
);

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Fetch export token
    builder.addCase(fetchExportToken.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchExportToken.fulfilled, (state, {payload}) => {
      state.isLoading = false;
      state.token = payload;
    });
    builder.addCase(fetchExportToken.rejected, (state, {error}) => {
      state.isLoading = false;
      state.error = error.message ?? 'Failed to fetch export token';
    });

    // Create export token
    builder.addCase(createExportToken.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createExportToken.fulfilled, (state, {payload}) => {
      state.isLoading = false;
      state.token = payload;
    });
    builder.addCase(createExportToken.rejected, (state, {error}) => {
      state.isLoading = false;
      state.error = error.message ?? 'Failed to create export token';
    });

    // Delete export token
    builder.addCase(deleteExportToken.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(
      deleteExportToken.fulfilled,
      (state, {payload: success}) => {
        state.isLoading = false;
        if (success) {
          state.token = null;
        } else {
          state.error = 'Failed to delete export token';
        }
      },
    );
    builder.addCase(deleteExportToken.rejected, (state, {error}) => {
      state.isLoading = false;
      state.error = error.message ?? 'Failed to delete export token';
    });
  },
});

export const {clearError} = exportSlice.actions;

export default exportSlice.reducer;
