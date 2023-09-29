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
