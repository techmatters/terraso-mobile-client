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

import devOnlyReducer from 'terraso-mobile-client/model/devOnly/devOnlySlice';
import {reducer as elevationReducer} from 'terraso-mobile-client/model/elevation/elevationSlice';
import exportReducer from 'terraso-mobile-client/model/export/exportSlice';
import {reducer as mapReducer} from 'terraso-mobile-client/model/map/mapSlice';
import {reducer as preferencesReducer} from 'terraso-mobile-client/model/preferences/preferencesSlice';
import projectReducer from 'terraso-mobile-client/model/project/projectSlice';
import siteReducer from 'terraso-mobile-client/model/site/siteSlice';
import soilDataReducer from 'terraso-mobile-client/model/soilData/soilDataSlice';
import soilIdMatchReducer from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import soilMetadataReducer from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import syncReducer from 'terraso-mobile-client/model/sync/syncSlice';

const sliceReducers = {
  ...sharedReducers,
  map: mapReducer,
  preferences: preferencesReducer,
  elevation: elevationReducer,
  export: exportReducer,
  site: siteReducer,
  project: projectReducer,
  soilData: soilDataReducer,
  soilMetadata: soilMetadataReducer,
  soilIdMatch: soilIdMatchReducer,
  sync: syncReducer,
  devOnly: devOnlyReducer,
};

export type AppState = StateFromReducersMapObject<typeof sliceReducers>;

export const rootReducer = combineReducers(sliceReducers);

// createGlobalReducer creates a reducer which is defined separately from
// any slice, and which doesn't define any new state, but instead acts on
// the combined state of all of the slices. actions handlers defined in a
// global reducer can therefore mutate state in multiple slices at once.
export const createGlobalReducer = (
  builderCallback: (builder: ActionReducerMapBuilder<AppState>) => void,
) => createReducer(() => rootReducer(undefined, {type: ''}), builderCallback);
