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

/* We expect to only ever use the following hook with one of coords or siteId */
export type SoilIdLocationInput = WithCoords | WithSiteId;
type WithCoords = {coords: Coords; siteId?: never};
type WithSiteId = {coords?: never; siteId: string};

export const useSoilIdOutput = (input: SoilIdLocationInput): SoilIdOutput => {
  /* Request active soil ID data based on this hook's input parameters */
  const coords = 'coords' in input ? input.coords : undefined;
  const siteId = 'siteId' in input ? input.siteId : undefined;
  const isSiteBased = !!siteId;
  const {addCoords, addSite} = useActiveSoilIdData();
  useEffect(() => {
    const activeData = isSiteBased ? addSite(siteId) : addCoords(coords!);
    return activeData.remove;
  }, [isSiteBased, coords, siteId, addSite, addCoords]);

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
