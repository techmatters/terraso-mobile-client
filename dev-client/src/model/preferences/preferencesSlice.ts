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

import {ColorWorkflow} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/ColorScreen';
import {PayloadAction, createSlice} from '@reduxjs/toolkit';

type Preferences = typeof initialState;

const initialState = {
  colorWorkflow: 'MANUAL' satisfies ColorWorkflow as ColorWorkflow,
} as const;

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
