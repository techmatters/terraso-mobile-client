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

import {DataBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';

export const getTopMatch = (
  matches: DataBasedSoilMatch[],
): DataBasedSoilMatch | undefined => {
  if (matches.length > 0) {
    return matches.reduce((a, b) => getBetterMatch(a, b));
  } else {
    return undefined;
  }
};

const getBetterMatch = (
  a: DataBasedSoilMatch,
  b: DataBasedSoilMatch,
): DataBasedSoilMatch => {
  if (a.combinedMatch && b.combinedMatch) {
    return a.combinedMatch.rank < b.combinedMatch.rank ? a : b;
  } else {
    return a.locationMatch.rank < b.locationMatch.rank ? a : b;
  }
};

export const getSortedMatches = (matches: DataBasedSoilMatch[]) => {
  return [...matches].sort((a, b) => {
    if (a.combinedMatch && b.combinedMatch) {
      return a.combinedMatch.rank - b.combinedMatch.rank;
    } else {
      return a.locationMatch.rank - b.locationMatch.rank;
    }
  });
};
