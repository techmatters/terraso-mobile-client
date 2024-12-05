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

import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import type {SharedDispatch} from 'terraso-client-shared/store/store';
import {Coords} from 'terraso-client-shared/types';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {DEFAULT_SOIL_DATA} from 'terraso-mobile-client/model/soilId/soilDataConstants';
import {selectSoilIdMatches} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {
  fetchDataBasedSoilMatches,
  fetchLocationBasedSoilMatches,
  soilDataToIdInput,
  SoilIdData,
  soilIdKey,
} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {selectSoilData} from 'terraso-mobile-client/store/selectors';

/*
 * Note that the soilId redux slice only supports a single cached value for soil ID data.
 * If multiple components are passing different inputs to this hook simultaneously, it
 * will not function correctly.
 */
export const useSoilIdData = (coords: Coords, siteId?: string): SoilIdData => {
  const isOffline = useIsOffline();
  const dispatch = useDispatch<SharedDispatch>();

  /* We only need to select soil data for data-based matches. */
  const soilDataSelector = siteId
    ? selectSoilData(siteId)
    : () => DEFAULT_SOIL_DATA;
  const soilData = useSelector(soilDataSelector);

  const key = soilIdKey(coords, siteId);
  const soilIdSelector = selectSoilIdMatches(key);
  const entry = useSelector(soilIdSelector);
  const entryPresent = Boolean(entry);

  /* load data if it's missing (and we're not offline) */
  useEffect(() => {
    if (!entryPresent && !isOffline) {
      if (siteId && soilData) {
        dispatch(
          fetchDataBasedSoilMatches({
            coords,
            siteId,
            soilData: soilDataToIdInput(soilData),
          }),
        );
      } else if (!siteId) {
        dispatch(fetchLocationBasedSoilMatches(coords));
      }
    }
  }, [dispatch, coords, siteId, entryPresent, isOffline, soilData]);

  return {
    locationBasedMatches: entry?.locationBasedMatches ?? [],
    dataBasedMatches: entry?.dataBasedMatches ?? [],
    status: entry?.status ?? 'loading',
  };
};
