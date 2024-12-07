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

import {createSelector} from '@reduxjs/toolkit';

import {Coords} from 'terraso-client-shared/types';

import {soilDataToIdInput} from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchInputs';
import {
  coordsKey,
  SoilIdLocationEntry,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppState} from 'terraso-mobile-client/store';

export const selectLocationBasedMatches = (
  coords: Coords,
): ((state: AppState) => SoilIdLocationEntry | undefined) => {
  const key = coordsKey(coords);
  return (state: AppState) => state.soilIdMatch.locationBasedMatches[key];
};

export const selectSiteDataBasedMatches = (siteId?: string) => {
  return (state: AppState) =>
    siteId ? state.soilIdMatch.siteDataBasedMatches[siteId] : undefined;
};

/* Memoized selector to let us select the current keys for location-based matches */
export const selectLocationBasedKeys = createSelector(
  [(state: AppState) => state.soilIdMatch.locationBasedMatches],
  /* Extract location-based match keys */
  entries => Object.keys(entries),
);

/* Memoized selector to let us select the current data-based inputs for a set of site IDs (potentially expensive) */
export const selectDataBasedInputs = createSelector(
  [
    (state: AppState) => state.soilIdMatch.siteDataBasedMatches,
    (_: AppState, siteIds: string[]) => siteIds,
  ],
  /* Combine data-based matches with site IDs to extract relevant entries */
  (entries, siteIds) =>
    Object.fromEntries(siteIds.map(siteId => [siteId, entries[siteId]?.input])),
);

/*
 * Memoized selector to let us select the upcoming data-based inputs for a set of site IDs (potentially expensive;
 * uses nested memoization to only recalculate input when source soil data changes)
 */
export const selectNextDataBasedInputs = createSelector(
  createSelector(
    [
      (state: AppState) => state.soilId.soilData,
      (_: AppState, siteIds: string[]) => siteIds,
    ],
    /* Combine soil data with site IDs to extract relevant entries */
    (soilData, siteIds) =>
      Object.fromEntries(siteIds.map(siteId => [siteId, soilData[siteId]])),
  ),
  /* Pass site-specific soil data through input format converter */
  soilData =>
    Object.fromEntries(
      Object.entries(soilData).map(([siteId, siteSoilData]) => [
        siteId,
        siteSoilData ? soilDataToIdInput(siteSoilData) : undefined,
      ]),
    ),
);
