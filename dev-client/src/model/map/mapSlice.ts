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

import {PayloadAction, createSlice} from '@reduxjs/toolkit';

export type Coords = {
  latitude: number;
  longitude: number;
};

export type UserLocation = {
  coords: Coords | null;
  accuracyM: number | null;
};
const initialState = {
  userLocation: {
    coords: null,
    accuracyM: null,
  } as UserLocation,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    updateLocation(state, action: PayloadAction<UserLocation>) {
      state.userLocation = action.payload;
    },
  },
});

export const {updateLocation} = mapSlice.actions;
export default mapSlice.reducer;
