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

import {createSlice, Draft, PayloadAction} from '@reduxjs/toolkit';

import {SyncTimestamp} from 'terraso-mobile-client/model/sync/records';

export type DevOnlyState = {
  syncInfoOpen: boolean;
  lastPullTimestamp: SyncTimestamp | null;
};

export const initialState: DevOnlyState = {
  syncInfoOpen: false,
  lastPullTimestamp: null,
};

export const setLastPullTimestamp = (
  state: Draft<DevOnlyState>,
  timestamp: SyncTimestamp,
) => {
  state.lastPullTimestamp = timestamp;
};

export const devOnlySlice = createSlice({
  name: 'devOnly',
  initialState,
  reducers: {
    setSyncInfoOpen: (state, action: PayloadAction<boolean>) => ({
      ...state,
      syncInfoOpen: action.payload,
    }),
  },
});

export const {setSyncInfoOpen} = devOnlySlice.actions;

export default devOnlySlice.reducer;
