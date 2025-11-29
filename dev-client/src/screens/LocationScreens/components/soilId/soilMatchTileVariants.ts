/*
 * Copyright © 2025 Technology Matters
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
  SoilMatch,
  UserRatingEntry,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {getMatchSelectionId} from 'terraso-mobile-client/model/soilMetadata/soilMetadataFunctions';

/**
 * Determines the visual variant for a soil match tile based on user ratings and selection state.
 *
 * @param thisSoilMatch - The soil match to determine the variant for
 * @param userRatings - Array of user ratings for soil matches
 * @param selectedSoilId - The ID of the currently selected soil, if any
 * @returns 'Selected' | 'Rejected' | 'Default' - The tile variant to display
 */
export const getTileVariant = (
  thisSoilMatch: SoilMatch,
  userRatings: UserRatingEntry[] | undefined,
  selectedSoilId: string | undefined,
): 'Selected' | 'Rejected' | 'Default' => {
  // When a soil is selected, show other soil tiles as if they were "Rejected"
  // (even though in the database they're not)
  if (selectedSoilId) {
    return selectedSoilId === getMatchSelectionId(thisSoilMatch)
      ? 'Selected'
      : 'Rejected';
  }

  // Unspecified ratings appear as "Unsure" (Default)
  const thisSoilRating = userRatings?.find(
    soilRatingEntry =>
      soilRatingEntry.soilMatchId === getMatchSelectionId(thisSoilMatch),
  );
  const rating = thisSoilRating ? thisSoilRating.rating : 'UNSURE';
  if (rating === 'REJECTED') return 'Rejected';
  return 'Default';
};
