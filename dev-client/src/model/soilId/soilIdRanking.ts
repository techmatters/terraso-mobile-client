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
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilIdResults} from 'terraso-client-shared/soilId/soilIdTypes';

export const getTopMatch = (
  results: SoilIdResults,
): LocationBasedSoilMatch | DataBasedSoilMatch | undefined => {
  const locationBased = results.locationBasedMatches;
  const dataBased = results.dataBasedMatches;

  if (dataBased.length > 0) {
    return dataBased.reduce(
      (prev, current) =>
        current.combinedMatch.rank > prev.combinedMatch.rank ? current : prev,
      dataBased[0],
    );
  } else if (locationBased.length > 0) {
    return locationBased.reduce(
      (prev, current) =>
        current.match.rank > prev.match.rank ? current : prev,
      locationBased[0],
    );
  } else {
    return undefined;
  }
};
