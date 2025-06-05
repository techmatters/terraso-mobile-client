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

import {useActiveSoilIdData} from 'terraso-mobile-client/context/SoilIdMatchContext';
import {SoilIdEntry} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {
  useSiteMatches,
  useTempLocationMatches,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks';

export type SoilIdOutput = Omit<SoilIdEntry, 'input'>;

// TODO-cknipe: Can we refactor everything to this and delete the one below for SoilIdData??
export const useSoilIdOutput = (
  coords: Coords,
  siteId?: string,
): SoilIdOutput => {
  /* Request active soil ID data based on this hook's input parameters */
  const isSiteBased = !!siteId;
  const {addCoords, addSite} = useActiveSoilIdData();
  useEffect(() => {
    const activeData = isSiteBased ? addSite(siteId) : addCoords(coords);
    return activeData.remove;
  }, [isSiteBased, coords, siteId, addSite, addCoords]);

  // TODO-cknipe: Refactor so they're not separate hooks??
  /* Select entries for relevant inputs and return the requested one */
  const tempLocationEntry = useTempLocationMatches(coords);
  const siteEntry = useSiteMatches(siteId);

  if (isSiteBased) {
    return {
      dataRegion: siteEntry?.dataRegion ?? undefined,
      matches: siteEntry?.matches ?? [],
      status: siteEntry?.status ?? 'loading',
    };
  } else {
    return {
      dataRegion: tempLocationEntry?.dataRegion ?? undefined,
      matches: tempLocationEntry?.matches ?? [],
      status: tempLocationEntry?.status ?? 'loading',
    };
  }
};
