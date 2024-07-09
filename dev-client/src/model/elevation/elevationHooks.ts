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

import {Coords} from 'terraso-client-shared/types';

import {selectElevation} from 'terraso-mobile-client/model/elevation/elevationSelectors';
import {fetchElevation} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const useElevationData = (coords: Coords): number | undefined => {
  const dispatch = useDispatch();
  const elevation = useSelector(selectElevation(coords));

  useEffect(() => {
    if (!elevation) {
      dispatch(fetchElevation(coords));
    }
  }, [dispatch, elevation, coords]);

  return elevation?.value;
};
