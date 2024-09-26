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

import {configureStore, StateFromReducersMapObject} from '@reduxjs/toolkit';

import {
  DispatchFromStoreFactory,
  handleAbortMiddleware,
  sharedReducers,
} from 'terraso-client-shared/store/store';

import {reducer as elevationReducer} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {reducer as mapReducer} from 'terraso-mobile-client/model/map/mapSlice';
import {reducer as preferencesReducer} from 'terraso-mobile-client/model/preferences/preferencesSlice';
import projectReducer from 'terraso-mobile-client/model/project/projectSlice';
import siteReducer from 'terraso-mobile-client/model/site/siteSlice';
import soilIdReducer from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {persistenceMiddleware} from 'terraso-mobile-client/store/persistence';

const reducers = {
  ...sharedReducers,
  map: mapReducer,
  preferences: preferencesReducer,
  elevation: elevationReducer,
  site: siteReducer,
  project: projectReducer,
  soilId: soilIdReducer,
};

export type AppState = StateFromReducersMapObject<typeof reducers>;
export type AppDispatch = DispatchFromStoreFactory<typeof createStore>;

export const useSelector: TypedUseSelectorHook<AppState> = reduxUseSelector;
export const useDispatch: () => AppDispatch = reduxUseDispatch;

export const createStore = (intialState?: Partial<AppState>) =>
  configureStore({
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .concat(handleAbortMiddleware)
        .concat(persistenceMiddleware),
    reducer: reducers,
    preloadedState: intialState,
  });
