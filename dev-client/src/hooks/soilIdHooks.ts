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

import {DEFAULT_SOIL_DATA} from 'terraso-client-shared/constants';
import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {selectSoilData} from 'terraso-client-shared/selectors';
import {selectSoilIdMatches} from 'terraso-client-shared/soilId/soilIdSelectors';
import {
  claimKey,
  fetchDataBasedSoilMatches,
  fetchLocationBasedSoilMatches,
  releaseKey,
  soilDataToIdInput,
  soilIdKey,
  SoilIdStatus,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Coords} from 'terraso-client-shared/types';

import {useDispatch, useSelector} from 'terraso-mobile-client/store';

/*
 * Note that the soilId redux slice only supports a single cached value for soil ID data.
 * If multiple components are passing different inputs to this hook simultaneously, it
 * will not function correctly.
 */
export const useSoilIdData = (
  coords: Coords,
  siteId?: string,
): {
  locationBasedMatches: LocationBasedSoilMatch[];
  dataBasedMatches: DataBasedSoilMatch[];
  status: SoilIdStatus;
} => {
  const dispatch = useDispatch();

  /* We only need to select soil data for data-based matches. */
  const soilDataSelector = siteId
    ? selectSoilData(siteId)
    : () => DEFAULT_SOIL_DATA;
  const soilData = useSelector(soilDataSelector);

  const key = soilIdKey(coords, siteId);
  const soilIdSelector = selectSoilIdMatches(key);
  const entry = useSelector(soilIdSelector);
  const entryPresent = Boolean(entry);

  /* Side effect 1: load data if it's missing */
  useEffect(() => {
    if (!entryPresent) {
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
  }, [dispatch, coords, siteId, entryPresent, soilData]);

  /* Side effect 2: record usage of keys in the soil ID cache */
  useEffect(() => {
    dispatch(claimKey(key));
    return () => {
      dispatch(releaseKey(key));
    };
  }, [dispatch, key]);

  return {
    locationBasedMatches: entry?.locationBasedMatches ?? [],
    dataBasedMatches: entry?.dataBasedMatches ?? [],
    status: entry?.status ?? 'loading',
  };
};
