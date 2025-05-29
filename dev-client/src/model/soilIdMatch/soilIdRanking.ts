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

import {
  SoilIdResults,
  SoilMatchForLocationOnly,
  SoilMatchForLocationWithData,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

export const getTopMatch = (
  results: SoilIdResults,
): SoilMatchForLocationOnly | SoilMatchForLocationWithData | undefined => {
  const locationBased = results.locationBasedMatches;
  const dataBased = results.dataBasedMatches;

  console.log('DATA BASED: ', dataBased);
  console.log('LOCATION BASED: ', locationBased);
  dataBased.forEach(match => {
    console.log('DataMatch ', match.dataMatch);
  });

  if (dataBased.length > 0 /* TODO-cknipe: Or if anything is null?? */) {
    return dataBased.reduce(getBetterDataMatch);
  } else if (locationBased.length > 0) {
    return locationBased.reduce(getBetterLocationMatch);
  } else {
    return undefined;
  }
};

const getBetterDataMatch = (
  a: SoilMatchForLocationWithData,
  b: SoilMatchForLocationWithData,
): SoilMatchForLocationWithData => {
  // TODO-cknipe: Are we ok that combinedMatch can be null? For sites with no data yet
  // Are there any other places that assume this exists? Should change the type definition?
  // TODO-cknipe: If we do it like this, probably want to do it a level up, not for each a/b?
  if (a.combinedMatch && b.combinedMatch) {
    return a.combinedMatch.rank < b.combinedMatch.rank ? a : b;
  } else {
    return a.locationMatch.rank < b.locationMatch.rank ? a : b;
  }
};

const getBetterLocationMatch = (
  a: SoilMatchForLocationOnly,
  b: SoilMatchForLocationOnly,
): SoilMatchForLocationOnly => {
  return a.locationMatch.rank < b.locationMatch.rank ? a : b;
};

export const getSortedDataBasedMatches = (soilIdData: SoilIdResults) => {
  return [...soilIdData.dataBasedMatches].sort((a, b) => {
    if (a.combinedMatch && b.combinedMatch) {
      return a.combinedMatch.rank - b.combinedMatch.rank;
    } else {
      return a.locationMatch.rank - b.locationMatch.rank;
    }
  });
};

export const getSortedLocationBasedMatches = (soilIdData: SoilIdResults) =>
  [...soilIdData.locationBasedMatches].sort(
    (a, b) => a.locationMatch.rank - b.locationMatch.rank,
  );
