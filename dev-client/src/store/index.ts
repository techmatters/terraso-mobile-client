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

import {
  useDispatch as reduxUseDispatch,
  useSelector as reduxUseSelector,
  TypedUseSelectorHook,
} from 'react-redux';

import {StateFromReducersMapObject} from '@reduxjs/toolkit';

import createStoreFactory, {
  DispatchFromStoreFactory,
  StateFromStoreFactory,
} from 'terraso-client-shared/store/store';

import {reducer as elevationReducer} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {reducer as mapReducer} from 'terraso-mobile-client/model/map/mapSlice';
import {reducer as preferencesReducer} from 'terraso-mobile-client/model/preferences/preferencesSlice';

const reducers = {
  map: mapReducer,
  preferences: preferencesReducer,
  elevation: elevationReducer,
};

export type AppState = StateFromStoreFactory<typeof createStore> &
  StateFromReducersMapObject<typeof reducers>;
export type AppDispatch = DispatchFromStoreFactory<typeof createStore>;

export const useSelector: TypedUseSelectorHook<AppState> = reduxUseSelector;
export const useDispatch: () => AppDispatch = reduxUseDispatch;

export const createStore = createStoreFactory(reducers);
