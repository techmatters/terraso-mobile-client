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

import {useEffect, useMemo} from 'react';

import {isEqual} from 'lodash';

import {Coords} from 'terraso-client-shared/types';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {SoilIdStatus} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {soilDataToIdInput} from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchInputs';
import {SoilIdResults} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {
  selectLocationBasedMatches,
  selectSiteData,
  selectSiteDataBasedMatches,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSelectors';
import {
  fetchLocationBasedSoilMatches,
  fetchSiteDataBasedSoilMatches,
  flushSiteDataBasedMatches,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export type SoilIdData = SoilIdResults & {
  status: SoilIdStatus;
};

export const useSoilIdData = (coords: Coords, siteId?: string): SoilIdData => {
  const isDataBased = !!siteId;
  const isOffline = useIsOffline();
  const dispatch = useDispatch();

  /* Select match entries for hook params */
  const locationEntry = useSelector(selectLocationBasedMatches(coords));
  const dataEntry = useSelector(selectSiteDataBasedMatches(siteId));

  /* Side-effect: fetching location-based matches */
  useEffect(() => {
    if (!isOffline && !isDataBased && !locationEntry) {
      dispatch(fetchLocationBasedSoilMatches(coords));
    }
  }, [isOffline, isDataBased, locationEntry, dispatch, coords]);

  /* Side-effect: fetching data-based matches */
  const soilData = useSelector(selectSiteData(siteId));
  const input = useMemo(() => soilDataToIdInput(soilData), [soilData]);
  useEffect(() => {
    if (!isOffline && isDataBased && !dataEntry) {
      dispatch(fetchSiteDataBasedSoilMatches({siteId, input}));
    }
  }, [isOffline, isDataBased, dataEntry, dispatch, siteId, input]);

  /* Side-effect: flushing data-based matches when inputs change */
  useEffect(() => {
    if (!isOffline && isDataBased) {
      /* We do deep-equality to only flush for structural changes, not just value changes */
      if (!isEqual(dataEntry?.input, input)) {
        dispatch(flushSiteDataBasedMatches(siteId));
      }
    }
  }, [isOffline, isDataBased, dataEntry, input, dispatch, siteId]);

  if (!isDataBased) {
    return {
      locationBasedMatches: locationEntry?.matches ?? [],
      dataBasedMatches: [],
      status: locationEntry?.status ?? 'loading',
    };
  } else {
    return {
      locationBasedMatches: [],
      dataBasedMatches: dataEntry?.matches ?? [],
      status: dataEntry?.status ?? 'loading',
    };
  }
};
