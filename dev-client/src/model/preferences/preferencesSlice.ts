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

import {ColorWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorScreen';

type Preferences = {
  colorWorkflow: ColorWorkflow;
  // Last-seen soil-ID algorithm semver (from the pull sync). Optional/persisted
  // so we can detect a MAJOR/MINOR change across sessions and flush cached matches.
  soilIdAlgorithmVersion?: string;
};

const initialState: Preferences = {
  colorWorkflow: 'MANUAL',
};

const {
  reducer,
  actions: {updatePreferences},
} = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    updatePreferences: (
      state,
      {payload}: PayloadAction<Partial<Preferences>>,
    ) => Object.assign(state, payload),
  },
});

export {reducer, updatePreferences};
