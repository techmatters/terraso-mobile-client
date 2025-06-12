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
import {coordsKey} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppState} from 'terraso-mobile-client/store';
import {getVisibleSoilDataForSite} from 'terraso-mobile-client/store/depthIntervalHelpers';

export const selectTempLocationMatches = (coords?: Coords) => {
  if (coords) {
    const key = coordsKey(coords);
    return (state: AppState) => state.soilIdMatch.locationBasedMatches[key];
  } else {
    return (_: AppState) => undefined;
  }
};

export const selectSiteMatches = (siteId?: string) => {
  return (state: AppState) =>
    siteId ? state.soilIdMatch.siteDataBasedMatches[siteId] : undefined;
};

/* Memoized selector to let us select the current keys for location-based matches */
export const selectTempLocationKeys = createSelector(
  [(state: AppState) => state.soilIdMatch.locationBasedMatches],
  /* Extract location-based match keys */
  entries => Object.keys(entries),
);

/* Memoized selector to let us select the current data-based inputs for a set of site IDs (potentially expensive) */
export const selectSiteInputs = createSelector(
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
 * uses nested memoization to only recalculate input when relevant data changes)
 *
 * NOTE: these are the _next_ inputs for the soil ID algorithm, but the _current_ inputs for the site
 */

// TODO-cknipe: We'd prefer not to recalculate when sites or projectSettings change
// Is there a better way to access those?
export const selectNextDataBasedInputs = createSelector(
  createSelector(
    [
      (_: AppState, siteIds: string[]) => siteIds,
      (state: AppState) => state.site.sites,
      (state: AppState) => state.soilData.soilData,
      (state: AppState) => state.soilData.projectSettings,
    ],
    /* Combine soil data with site IDs to extract relevant entries */
    (siteIds, sites, soilData, projectSettings) =>
      Object.fromEntries(
        siteIds.map(siteId => {
          return [
            siteId,
            getVisibleSoilDataForSite(siteId, sites, soilData, projectSettings),
          ];
        }),
      ),
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
