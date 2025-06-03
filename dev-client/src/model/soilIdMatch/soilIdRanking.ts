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

import {SoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {
  SoilMatchForLocationOnly,
  SoilMatchForLocationWithData,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

export const getTopMatch = (
  results: SoilIdOutput,
): SoilMatchForLocationOnly | SoilMatchForLocationWithData | undefined => {
  if (results.matches.length > 0 && results.withData === true) {
    return results.matches.reduce((a, b) =>
      getBetterDataMatch(
        a as SoilMatchForLocationWithData,
        b as SoilMatchForLocationWithData,
      ),
    );
  } else if (results.matches.length > 0 && results.withData === false) {
    return results.matches.reduce((a, b) =>
      getBetterLocationMatch(
        a as SoilMatchForLocationOnly,
        b as SoilMatchForLocationOnly,
      ),
    );
  } else {
    return undefined;
  }
};

// TODO-cknipe: Delete these
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

export const getSortedMatchesWithData = (
  matches: SoilMatchForLocationWithData[],
) => {
  return matches.slice().sort((a, b) => {
    if (a.combinedMatch && b.combinedMatch) {
      return a.combinedMatch.rank - b.combinedMatch.rank;
    } else {
      return a.locationMatch.rank - b.locationMatch.rank;
    }
  });
};

export const getSortedMatchesForLocation = (
  matches: SoilMatchForLocationOnly[],
) =>
  matches.slice().sort((a, b) => a.locationMatch.rank - b.locationMatch.rank);

// export const getSortedDataBasedMatches = (soilIdData: SoilIdResults) => {
//   return [...soilIdData.dataBasedMatches].sort((a, b) => {
//     if (a.combinedMatch && b.combinedMatch) {
//       return a.combinedMatch.rank - b.combinedMatch.rank;
//     } else {
//       return a.locationMatch.rank - b.locationMatch.rank;
//     }
//   });
// };

// export const getSortedLocationBasedMatches = (soilIdData: SoilIdResults) =>
//   [...soilIdData.locationBasedMatches].sort(
//     (a, b) => a.locationMatch.rank - b.locationMatch.rank,
//   );
