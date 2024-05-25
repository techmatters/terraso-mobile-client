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
import {useSelector} from 'react-redux';

import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {selectSoilData} from 'terraso-client-shared/selectors';
import {
  selectSoilIdData,
  selectSoilIdInput,
  selectSoilIdStatus,
} from 'terraso-client-shared/soilId/soilIdSelectors';
import {
  fetchSoilIdMatches,
  LoadingState,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {Coords} from 'terraso-client-shared/types';
import {isEquivalentCoords} from 'terraso-client-shared/utils';

import {useDispatch} from 'terraso-mobile-client/store';

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
  status: LoadingState;
} => {
  const dispatch = useDispatch();
  const soilIdInput = useSelector(selectSoilIdInput());
  const soilIdData = useSelector(selectSoilIdData());
  const soilIdStatus = useSelector(selectSoilIdStatus());

  /*
   * Selector handles case of no specified site ID by selecting undefined.
   * (We have to keep the useSelector call to be sure that hook usage is
   * consistent across renders.)
   */
  const soilDataSelector = siteId ? selectSoilData(siteId) : () => undefined;
  const soilData = useSelector(soilDataSelector);

  useEffect(() => {
    if (
      siteId !== soilIdInput.siteId ||
      !isEquivalentCoords(coords, soilIdInput.coords)
    ) {
      dispatch(
        fetchSoilIdMatches({
          coords,
          siteId,
          soilData,
        }),
      );
    }
  }, [dispatch, coords, siteId, soilData, soilIdInput]);

  return {
    locationBasedMatches: soilIdData.locationBasedMatches,
    dataBasedMatches: soilIdData.dataBasedMatches,
    status: soilIdStatus,
  };
};
