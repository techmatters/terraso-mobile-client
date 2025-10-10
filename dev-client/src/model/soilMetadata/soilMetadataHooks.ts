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

import {useCallback} from 'react';
import {useSelector} from 'react-redux';

import {UserMatchRating} from 'terraso-client-shared/graphqlSchema/graphql';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {
  selectSoilMetadata,
  selectUserRatingsMetadata,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {updateSoilMetadata} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import {useDispatch} from 'terraso-mobile-client/store';

// TODO-cknipe: Maybe make this return just a regular value, not an obj
export const useSelectedSoil = (
  siteId: string,
): {selectedSoilId: string | undefined} => {
  const {selectedSoilId: oldSelectedSoil} = useSoilIdSelection(siteId);
  const userRatings = useSelector(selectUserRatingsMetadata(siteId));
  if (isFlagEnabled('FF_select_soil')) {
    const selectedEntry = userRatings?.find(
      entry => entry?.rating === 'SELECTED',
    );
    return {selectedSoilId: selectedEntry?.soilMatchId};
  } else {
    return {selectedSoilId: oldSelectedSoil};
  }
};

export const useSoilIdSelection = (
  siteId: string,
): {
  selectedSoilId?: string;
  selectSoilId: (selectedSoilId: string | null) => Promise<void>;
} => {
  const dispatch = useDispatch();
  const soilMetadata = useSelector(selectSoilMetadata(siteId));

  // TODO-cknipe
  if (isFlagEnabled('FF_select_soil')) {
    console.log(
      "Avoid using the 'useSoilIdSelection' hook with the FF_select_soil flag on",
    );
  }

  const selectedSoilId =
    soilMetadata.selectedSoilId === null ||
    soilMetadata.selectedSoilId === undefined
      ? undefined
      : soilMetadata.selectedSoilId;

  const selectSoilId = useCallback(
    (newSelection: string | null) =>
      dispatch(
        updateSoilMetadata({siteId: siteId, selectedSoilId: newSelection}),
      ).then(
        () => {} /* Empty then() to simplify promise return type to void */,
      ),
    [dispatch, siteId],
  );
  return {selectedSoilId, selectSoilId};
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
