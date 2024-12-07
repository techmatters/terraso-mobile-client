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

import {Coords} from 'terraso-client-shared/types';

import {DEFAULT_SOIL_DATA} from 'terraso-mobile-client/model/soilId/soilDataConstants';
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

export const selectSiteData = (siteId?: string) => {
  return (state: AppState) =>
    (siteId ? state.soilId.soilData[siteId] : undefined) ?? DEFAULT_SOIL_DATA;
};

export const selectSiteDataBasedMatches = (siteId?: string) => {
  return (state: AppState) =>
    siteId ? state.soilIdMatch.siteDataBasedMatches[siteId] : undefined;
};
