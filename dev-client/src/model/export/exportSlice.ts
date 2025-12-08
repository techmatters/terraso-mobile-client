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
import type {
  ExportToken,
  ResourceType,
} from 'terraso-mobile-client/model/export/exportTypes';

/**
 * Builds a key for the tokens dictionary
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 * @returns Key in format "RESOURCE_TYPE:resourceId"
 */
export const buildTokenKey = (
  resourceType: ResourceType,
  resourceId: string,
): string => `${resourceType}:${resourceId}`;

/**
 * Converts an array of export tokens into a dictionary
 * @param tokens - Array of export tokens
 * @returns Dictionary keyed by "RESOURCE_TYPE:resourceId"
 */
const tokensArrayToDict = (tokens: ExportToken[]): Record<string, string> => {
  const dict: Record<string, string> = {};
  for (const token of tokens) {
    const key = buildTokenKey(token.resourceType, token.resourceId);
    dict[key] = token.token;
  }
  return dict;
};

export type ExportState = {
  tokens: Record<string, string>; // {"USER:abc-123": "token-xxx", ...}
};

const initialState: ExportState = {
  tokens: {},
};

/**
 * Fetches all export tokens for the current user
 * Called during sync/pull operations
 */
export const fetchAllExportTokens = createAsyncThunk(
  'export/fetchAllExportTokens',
  exportService.fetchAllExportTokens,
);

/**
 * Creates a new export token for a given resource
 * Returns all tokens after creation to keep state in sync
 * @param resourceType - The type of resource (USER, PROJECT, or SITE)
 * @param resourceId - The ID of the resource
 */
export const createExportToken = createAsyncThunk(
  'export/createExportToken',
  ({
    resourceType,
    resourceId,
  }: {
    resourceType: ResourceType;
    resourceId: string;
  }) => exportService.createExportToken(resourceType, resourceId),
);

/**
 * Deletes an export token
 * Returns all remaining tokens after deletion to keep state in sync
 * @param token - The token to delete
 */
export const deleteExportToken = createAsyncThunk(
  'export/deleteExportToken',
  exportService.deleteExportToken,
);

/**
 * Sets export tokens in the state
 * Used by syncGlobalReducer when fetching all user data
 */
export const setExportTokens = (
  state: ExportState,
  tokens: ExportToken[],
): void => {
  state.tokens = tokensArrayToDict(tokens);
};

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {},
  extraReducers: builder => {
    // Fetch all tokens (called during sync)
    builder.addCase(fetchAllExportTokens.fulfilled, (state, {payload}) => {
      state.tokens = tokensArrayToDict(payload);
    });

    // Create token - backend returns all tokens
    builder.addCase(createExportToken.fulfilled, (state, {payload}) => {
      state.tokens = tokensArrayToDict(payload);
    });

    // Delete token - backend returns all remaining tokens
    builder.addCase(deleteExportToken.fulfilled, (state, {payload}) => {
      state.tokens = tokensArrayToDict(payload);
    });
  },
});

export default exportSlice.reducer;
