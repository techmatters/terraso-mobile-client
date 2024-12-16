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

import {configureStore, createSlice} from '@reduxjs/toolkit';

import {patchPersistedReduxState} from 'terraso-mobile-client/store/persistence';

jest.mock('terraso-mobile-client/config/index', () => ({
  APP_CONFIG: {
    environment: 'production',
  },
}));

describe('persistence middleware', () => {
  const {
    reducer,
    actions: {increment},
  } = createSlice({
    name: 'test',
    initialState: {counter: 0},
    reducers: {
      increment: ({counter}) => ({counter: counter + 1}),
    },
  });

  test('persistence middleware saves state to disk', () => {
    jest.isolateModules(() => {
      const {
        kvStorage,
      } = require('terraso-mobile-client/persistence/kvStorage');
      kvStorage.setBool('FF_offline', true);

      const {
        persistenceMiddleware,
        loadPersistedReduxState,
      } = require('terraso-mobile-client/store/persistence');

      const store = configureStore({
        middleware: [persistenceMiddleware],
        reducer,
      });

      expect(loadPersistedReduxState()).toBe(undefined);

      store.dispatch(increment());

      expect(loadPersistedReduxState()).toEqual({counter: 1});
    });
  });

  test('can initialize store with persisted state', () => {
    jest.isolateModules(() => {
      const {
        kvStorage,
      } = require('terraso-mobile-client/persistence/kvStorage');
      kvStorage.setBool('FF_offline', true);

      const {
        persistenceMiddleware,
        loadPersistedReduxState,
      } = require('terraso-mobile-client/store/persistence');

      kvStorage.setMap('persisted-redux-state', {counter: 1});
      const store = configureStore({
        middleware: [persistenceMiddleware],
        reducer,
        preloadedState: loadPersistedReduxState(),
      });

      expect(store.getState()).toEqual({counter: 1});

      store.dispatch(increment());

      expect(loadPersistedReduxState()).toEqual({counter: 2});
    });
  });

  test('persistence middleware does nothing without feature flag', () => {
    jest.isolateModules(() => {
      const {
        kvStorage,
      } = require('terraso-mobile-client/persistence/kvStorage');
      kvStorage.setBool('FF_offline', false);

      const {
        persistenceMiddleware,
        loadPersistedReduxState,
      } = require('terraso-mobile-client/store/persistence');

      const store = configureStore({
        middleware: [persistenceMiddleware],
        reducer,
      });

      expect(loadPersistedReduxState()).toBe(undefined);

      store.dispatch(increment());

      expect(loadPersistedReduxState()).toBe(undefined);
    });
  });
});

describe('patchPersistedReduxState', () => {
  test('adds sync records if absent', () => {
    const state: any = {soilData: {soilSync: undefined}};
    const result = patchPersistedReduxState(state);
    expect(result.soilData!.soilSync).toEqual({});
  });

  test('retains sync records if present', () => {
    const state: any = {soilData: {soilSync: {a: {}}}};
    const result = patchPersistedReduxState(state);
    expect(result.soilData!.soilSync).toEqual({a: {}});
  });
});
