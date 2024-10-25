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

import {configureStore} from '@reduxjs/toolkit';
import reduceReducers from 'reduce-reducers';

import {
  DispatchFromStoreFactory,
  handleAbortMiddleware,
} from 'terraso-client-shared/store/store';

import {projectGlobalReducer} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {siteGlobalReducer} from 'terraso-mobile-client/model/site/siteGlobalReducer';
import {soilIdGlobalReducer} from 'terraso-mobile-client/model/soilId/soilIdGlobalReducer';
import {persistenceMiddleware} from 'terraso-mobile-client/store/persistence';
import {AppState, rootReducer} from 'terraso-mobile-client/store/reducers';

export type {AppState} from 'terraso-mobile-client/store/reducers';
export type AppDispatch = DispatchFromStoreFactory<typeof createStore>;

export const useSelector: TypedUseSelectorHook<AppState> = reduxUseSelector;
export const useDispatch: () => AppDispatch = reduxUseDispatch;

const globalReducers = [
  soilIdGlobalReducer,
  siteGlobalReducer,
  projectGlobalReducer,
];

export const createStore = (intialState?: Partial<AppState>) =>
  configureStore({
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware()
        .concat(handleAbortMiddleware)
        .concat(persistenceMiddleware),
    reducer: reduceReducers(rootReducer, ...globalReducers),
    preloadedState: intialState,
  });
