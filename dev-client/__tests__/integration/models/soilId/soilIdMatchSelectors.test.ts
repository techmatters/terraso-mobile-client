/*
 * Copyright © 2023-2024 Technology Matters
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

import {renderSelectorHook} from '@testing/integration/utils';

import {initialState as accountInitialState} from 'terraso-client-shared/account/accountSlice';

import {DEFAULT_SOIL_DATA} from 'terraso-mobile-client/model/soilData/soilDataConstants';
import {soilDataToIdInput} from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchInputs';
import {selectNextDataBasedInputs} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSelectors';
import {initialState as syncInitialState} from 'terraso-mobile-client/model/sync/syncSlice';
import {AppState, useSelector} from 'terraso-mobile-client/store';

const appState = (): AppState => {
  return {
    account: accountInitialState,
    map: {userLocation: {accuracyM: null, coords: null}},
    elevation: {elevationCache: {}},
    notifications: {messages: {}},
    preferences: {colorWorkflow: 'MANUAL'},
    project: {projects: {}},
    site: {sites: {}},
    soilData: {
      projectSettings: {},
      soilSync: {},
      soilData: {},
      status: 'ready',
    },
    soilIdMatch: {
      locationBasedMatches: {},
      siteDataBasedMatches: {},
    },
    soilMetadata: {
      soilMetadata: {},
    },
    sync: syncInitialState,
  };
};

describe('selectNextDataBasedInputs', () => {
  test('supplies default soil data for newly created sites', () => {
    const state = appState();

    const selected = renderSelectorHook(
      () => useSelector(s => selectNextDataBasedInputs(s, ['id'])),
      state,
    );

    expect(selected).toEqual({
      id: soilDataToIdInput(DEFAULT_SOIL_DATA),
    });
  });
});
