import {PayloadAction, createSlice} from '@reduxjs/toolkit';
import {Location} from '@rnmapbox/maps';

type MapState = {
  userLocation?: Location;
};

const initialState = {} as MapState;

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    updateLocation(state, action: PayloadAction<Location>) {
      state.userLocation = action.payload;
    },
  },
});

export const {updateLocation} = mapSlice.actions;
export default mapSlice.reducer;
