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
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type SyncState = {
  pullRequested: boolean;
};

export const initialState = {
  pullRequested: false,
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setPullRequested: (state, action: PayloadAction<boolean>) => ({
      ...state,
      pullRequested: action.payload,
    }),
  },
});

export const {setPullRequested} = syncSlice.actions;

export default syncSlice.reducer;
