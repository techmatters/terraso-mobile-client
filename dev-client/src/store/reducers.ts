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

import {
  ActionReducerMapBuilder,
  combineReducers,
  createReducer,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

import {sharedReducers} from 'terraso-client-shared/store/store';

import {reducer as elevationReducer} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {reducer as mapReducer} from 'terraso-mobile-client/model/map/mapSlice';
import {reducer as preferencesReducer} from 'terraso-mobile-client/model/preferences/preferencesSlice';
import projectReducer from 'terraso-mobile-client/model/project/projectSlice';
import siteReducer from 'terraso-mobile-client/model/site/siteSlice';
import soilIdReducer from 'terraso-mobile-client/model/soilId/soilIdSlice';

const sliceReducers = {
  ...sharedReducers,
  map: mapReducer,
  preferences: preferencesReducer,
  elevation: elevationReducer,
  site: siteReducer,
  project: projectReducer,
  soilId: soilIdReducer,
};

export type AppState = StateFromReducersMapObject<typeof sliceReducers>;

export const rootReducer = combineReducers(sliceReducers);

export const createGlobalReducer = (
  builderCallback: (builder: ActionReducerMapBuilder<AppState>) => void,
) => createReducer(() => rootReducer(undefined, {type: ''}), builderCallback);
