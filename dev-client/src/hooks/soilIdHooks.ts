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

import {SoilIdStatus} from 'terraso-client-shared/soilId/soilIdTypes';
import {Coords} from 'terraso-client-shared/types';

import {useActiveSoilIdData} from 'terraso-mobile-client/context/soilIdMatchContext2';
import {SoilIdResults} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {
  useLocationBasedMatches,
  useSiteDataBasedMatches,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks';

export type SoilIdData = SoilIdResults & {
  status: SoilIdStatus;
};

export const useSoilIdData = (coords: Coords, siteId?: string): SoilIdData => {
  /* Determine what we can and can't fetch based on online status and usage type */
  const isDataBased = !!siteId;

  /* Request active soil ID data for hook input parameters */
  const {addCoords, addSite} = useActiveSoilIdData();
  useEffect(() => {
    const activeData = isDataBased ? addSite(siteId) : addCoords(coords);
    return activeData.remove;
  }, [isDataBased, coords, siteId, addSite, addCoords]);

  /* Select entries for relevant inputs and return the requested one */
  const locationEntry = useLocationBasedMatches(coords);
  const dataEntry = useSiteDataBasedMatches(siteId);
  if (isDataBased) {
    return {
      locationBasedMatches: [],
      dataBasedMatches: dataEntry?.matches ?? [],
      status: dataEntry?.status ?? 'loading',
    };
  } else {
    return {
      locationBasedMatches: locationEntry?.matches ?? [],
      dataBasedMatches: [],
      status: locationEntry?.status ?? 'loading',
    };
  }
};
