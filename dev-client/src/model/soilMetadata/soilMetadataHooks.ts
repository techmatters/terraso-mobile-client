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

import {useSelector} from 'react-redux';

import {UserMatchRating} from 'terraso-client-shared/graphqlSchema/graphql';

import {selectUserRatingsMetadata} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';

export const useSelectedSoil = (siteId?: string): string | undefined => {
  // Any old selectedSoilId's on the model should have been converted to userRatings in persistence.ts or by backend migration
  const userRatings = useSelector(selectUserRatingsMetadata(siteId));
  const selectedEntry = userRatings?.find(
    entry => entry?.rating === 'SELECTED',
  );
  return selectedEntry?.soilMatchId;
};

export const useUserRating = (
  siteId: string,
  soilMatchId?: string,
): UserMatchRating => {
  const userRatings = useSelector(selectUserRatingsMetadata(siteId));
  const thisSoilRating = userRatings?.find(
    soilRatingEntry => soilRatingEntry?.soilMatchId === soilMatchId,
  );
  return thisSoilRating ? thisSoilRating.rating : 'UNSURE';
};

export const useUserRatings = (siteId: string | undefined) => {
  return useSelector(selectUserRatingsMetadata(siteId));
};
