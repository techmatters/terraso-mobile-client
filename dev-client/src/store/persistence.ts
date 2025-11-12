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
import {merge, omit} from 'lodash/fp';

import type {
  Maybe,
  UserRatingEntry,
} from 'terraso-client-shared/graphqlSchema/graphql';
import type {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';

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
  const tempState = upgradeSoilMetadataOct2025(state);
  return merge(tempState, {
    soilData: {soilSync: {}},
    soilMetadata: {soilMetadata: {}, soilMetadataSync: {}},
    soilIdMatch: {locationBasedMatches: {}, siteDataBasedMatches: {}},
    sync: {pullRequested: false},
  });
};

/**
 * Migrates soil metadata from the old selectedSoilId format to the new userRatings format.
 * @param state The persisted Redux state to upgrade
 * @returns The upgraded state with userRatings instead of selectedSoilId
 */
function upgradeSoilMetadataOct2025(
  state: Partial<AppState>,
): Partial<AppState> {
  // If there's no soilMetadata state, nothing to upgrade
  if (!state.soilMetadata?.soilMetadata) {
    return state;
  }

  const oldMetadataEntries = state.soilMetadata.soilMetadata;
  const upgradedEntries: Record<string, SoilMetadata> = {};

  for (const [siteId, siteMetadata] of Object.entries(oldMetadataEntries)) {
    const selectedSoilId = siteMetadata.selectedSoilId;
    let userRatings: Maybe<UserRatingEntry>[];
    if (selectedSoilId && !siteMetadata.userRatings) {
      // Migrate selectedSoilId to userRatings, and remove selectedSoilId
      userRatings = [
        {
          soilMatchId: selectedSoilId,
          rating: 'SELECTED',
        } as UserRatingEntry,
      ];
    } else {
      userRatings = siteMetadata.userRatings ?? [];
    }
    upgradedEntries[siteId] = {
      ...omit('selectedSoilId', siteMetadata),
      userRatings,
    };
  }

  return {
    ...state,
    soilMetadata: {
      ...state.soilMetadata,
      soilMetadata: upgradedEntries,
      soilMetadataSync: state.soilMetadata.soilMetadataSync ?? {},
      // TODO-cknipe: Do we need that? What are the consequences if not?
    },
  };
}
