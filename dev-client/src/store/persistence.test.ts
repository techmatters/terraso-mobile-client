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
        middleware: () => [persistenceMiddleware] as any,
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

      kvStorage.setObject('persisted-redux-state', {counter: 1});
      const store = configureStore({
        middleware: () => [persistenceMiddleware] as any,
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
        middleware: () => [persistenceMiddleware] as any,
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

  test('migrates selectedSoilId to userRatings and preserves sites without selectedSoilId', () => {
    const state: any = {
      soilMetadata: {
        soilMetadata: {
          'site-1': {
            selectedSoilId: 'soil-match-123',
          },
          'site-2': {},
        },
      },
    };

    const result = patchPersistedReduxState(state);

    // Assert: both sites still exist in output
    expect(result.soilMetadata!.soilMetadata).toHaveProperty('site-1');
    expect(result.soilMetadata!.soilMetadata).toHaveProperty('site-2');

    // Assert: Site 1 userRatings has selected soil
    expect(result.soilMetadata!.soilMetadata['site-1'].userRatings).toEqual([
      {soilMatchId: 'soil-match-123', rating: 'SELECTED'},
    ]);

    // Assert: Site 1 no longer has selectedSoilId property
    expect(result.soilMetadata!.soilMetadata['site-1']).not.toHaveProperty(
      'selectedSoilId',
    );

    // Assert: Site 2 is preserved with empty userRatings
    expect(result.soilMetadata!.soilMetadata['site-2'].userRatings).toEqual([]);
    expect(result.soilMetadata!.soilMetadata['site-2']).not.toHaveProperty(
      'selectedSoilId',
    );

    // Assert: Original input not mutated
    expect(state.soilMetadata.soilMetadata['site-1']).toHaveProperty(
      'selectedSoilId',
      'soil-match-123',
    );
  });

  test('preserves existing userRatings when migrating selectedSoilId', () => {
    const state: any = {
      soilMetadata: {
        soilMetadata: {
          'site-1': {
            userRatings: [
              {soilMatchId: 'soil-1', rating: 'SELECTED'},
              {soilMatchId: 'soil-2', rating: 'REJECTED'},
              {soilMatchId: 'soil-3', rating: 'UNSURE'},
            ],
          },
        },
      },
    };

    const result = patchPersistedReduxState(state);

    expect(result.soilMetadata!.soilMetadata['site-1'].userRatings).toEqual([
      {soilMatchId: 'soil-1', rating: 'SELECTED'},
      {soilMatchId: 'soil-2', rating: 'REJECTED'},
      {soilMatchId: 'soil-3', rating: 'UNSURE'},
    ]);
    expect(result.soilMetadata!.soilMetadata['site-1']).not.toHaveProperty(
      'selectedSoilId',
    );
  });

  test('preserves userRatings and discards selectedSoilId if both', () => {
    // This shouldn't happen in the actual app, but here just in case
    const state: any = {
      soilMetadata: {
        soilMetadata: {
          'site-1': {
            selectedSoilId: 'soil-1',
            userRatings: [
              {soilMatchId: 'soil-2', rating: 'REJECTED'},
              {soilMatchId: 'soil-3', rating: 'UNSURE'},
            ],
          },
        },
      },
    };

    const result = patchPersistedReduxState(state);

    expect(result.soilMetadata!.soilMetadata['site-1'].userRatings).toEqual([
      {soilMatchId: 'soil-2', rating: 'REJECTED'},
      {soilMatchId: 'soil-3', rating: 'UNSURE'},
    ]);
    expect(result.soilMetadata!.soilMetadata['site-1']).not.toHaveProperty(
      'selectedSoilId',
    );
  });

  // This will anger Typescript because the properties don't currently exist, but we want to test that any future properties will be maintained
  test('preserves other metadata properties when migrating', () => {
    const state: any = {
      soilMetadata: {
        soilMetadata: {
          'site-1': {
            selectedSoilId: 'soil-match-123',
            someCustomProperty: 'important-data',
            anotherProperty: {nested: 'value'},
            numericProperty: 42,
          },
        },
      },
    };

    const result = patchPersistedReduxState(state);

    // @ts-expect-error - Testing that additional properties are preserved
    expect(result.soilMetadata!.soilMetadata['site-1'].someCustomProperty).toBe(
      'important-data',
    );
    // @ts-expect-error - Testing that additional properties are preserved
    expect(result.soilMetadata!.soilMetadata['site-1'].anotherProperty).toEqual(
      {nested: 'value'},
    );
    // @ts-expect-error - Testing that additional properties are preserved
    expect(result.soilMetadata!.soilMetadata['site-1'].numericProperty).toBe(
      42,
    );

    // Should still migrate selectedSoilId
    expect(result.soilMetadata!.soilMetadata['site-1'].userRatings).toEqual([
      {soilMatchId: 'soil-match-123', rating: 'SELECTED'},
    ]);
    expect(result.soilMetadata!.soilMetadata['site-1']).not.toHaveProperty(
      'selectedSoilId',
    );
  });
});
