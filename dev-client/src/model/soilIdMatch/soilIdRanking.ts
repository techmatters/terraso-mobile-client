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
  SoilMatchForSite,
  SoilMatchForTempLocation,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

export const getTopMatch = (
  results: SoilIdOutput,
): SoilMatchForTempLocation | SoilMatchForSite | undefined => {
  if (results.matches.length > 0) {
    return results.matches.reduce((a, b) =>
      getBetterSiteMatch(a as SoilMatchForSite, b as SoilMatchForSite),
    );
  } else if (results.matches.length > 0) {
    return results.matches.reduce((a, b) =>
      getBetterTempLocationMatch(
        a as SoilMatchForTempLocation,
        b as SoilMatchForTempLocation,
      ),
    );
  } else {
    return undefined;
  }
};

// TODO-cknipe: Delete these
const getBetterSiteMatch = (
  a: SoilMatchForSite,
  b: SoilMatchForSite,
): SoilMatchForSite => {
  // TODO-cknipe: Are we ok that combinedMatch can be null? For sites with no data yet
  // Are there any other places that assume this exists? Should change the type definition?
  // TODO-cknipe: If we do it like this, probably want to do it a level up, not for each a/b?
  if (a.combinedMatch && b.combinedMatch) {
    return a.combinedMatch.rank < b.combinedMatch.rank ? a : b;
  } else {
    return a.locationMatch.rank < b.locationMatch.rank ? a : b;
  }
};

const getBetterTempLocationMatch = (
  a: SoilMatchForTempLocation,
  b: SoilMatchForTempLocation,
): SoilMatchForTempLocation => {
  return a.locationMatch.rank < b.locationMatch.rank ? a : b;
};

export const getSortedMatchesForSite = (matches: SoilMatchForSite[]) => {
  return matches.slice().sort((a, b) => {
    if (a.combinedMatch && b.combinedMatch) {
      return a.combinedMatch.rank - b.combinedMatch.rank;
    } else {
      return a.locationMatch.rank - b.locationMatch.rank;
    }
  });
};

export const getSortedMatchesForTempLocation = (
  matches: SoilMatchForTempLocation[],
) =>
  matches.slice().sort((a, b) => a.locationMatch.rank - b.locationMatch.rank);
