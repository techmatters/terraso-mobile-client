import {PayloadAction, createSlice} from '@reduxjs/toolkit';

export type Coords = {
  latitude: number;
  longitude: number;
};

const initialState = {
  userLocation: null as Coords | null,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    updateLocation(state, action: PayloadAction<Coords>) {
      state.userLocation = action.payload;
    },
  },
});

export const {updateLocation} = mapSlice.actions;
export default mapSlice.reducer;
