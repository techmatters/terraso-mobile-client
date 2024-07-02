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
import {
  selectSoilIdDataBasedMatches,
  selectSoilIdLocationBasedMatches,
} from 'terraso-client-shared/soilId/soilIdSelectors';
import {
  fetchDataBasedSoilMatches,
  fetchLocationBasedSoilMatches,
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
  /* We only need to select soil data for data-based matches. */
  const soilDataSelector = siteId
    ? selectSoilData(siteId)
    : () => DEFAULT_SOIL_DATA;
  const soilData = useSelector(soilDataSelector);

  const paramsKey = soilIdKey(coords, siteId);
  const dataBasedSelector = selectSoilIdDataBasedMatches(paramsKey);
  const locationBasedSelector = selectSoilIdLocationBasedMatches(paramsKey);
  const dataBasedEntry = useSelector(dataBasedSelector);
  const locationBasedEntry = useSelector(locationBasedSelector);
  const entryPresent = siteId
    ? Boolean(dataBasedEntry)
    : Boolean(locationBasedEntry);

  const dispatch = useDispatch();
  useEffect(() => {
    if (siteId && soilData && !entryPresent) {
      dispatch(
        fetchDataBasedSoilMatches({
          coords,
          siteId,
          soilData: soilDataToIdInput(soilData),
        }),
      );
    } else if (!siteId && !entryPresent) {
      dispatch(fetchLocationBasedSoilMatches(coords));
    }
  }, [dispatch, coords, siteId, entryPresent, soilData]);

  return siteId
    ? {
        locationBasedMatches: [],
        dataBasedMatches: dataBasedEntry?.matches ?? [],
        status: dataBasedEntry?.status ?? 'loading',
      }
    : {
        locationBasedMatches: locationBasedEntry?.matches ?? [],
        dataBasedMatches: [],
        status: locationBasedEntry?.status ?? 'loading',
      };
};
