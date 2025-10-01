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

import {Middleware} from '@reduxjs/toolkit';
import {merge} from 'lodash/fp';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {AppState} from 'terraso-mobile-client/store';

const PERSISTED_STATE_KEY = 'persisted-redux-state';
export const persistenceMiddleware: Middleware<{}, AppState> =
  store => next => action => {
    const result = next(action);
    if (isFlagEnabled('FF_offline')) {
      const newState = store.getState();
      kvStorage.setObject(PERSISTED_STATE_KEY, newState);
    }
    return result;
  };

export const loadPersistedReduxState = () => {
  if (isFlagEnabled('FF_offline')) {
    return (
      kvStorage.getObject<Partial<AppState>>(PERSISTED_STATE_KEY) ?? undefined
    );
  }
};

export const patchPersistedReduxState = (
  state: Partial<AppState>,
): Partial<AppState> => {
  return merge(state, {
    soilData: {soilSync: {}},
    soilMetadata: {soilMetadata: {}},
    soilIdMatch: {locationBasedMatches: {}, siteDataBasedMatches: {}},
    sync: {pullRequested: false},
  });
};
