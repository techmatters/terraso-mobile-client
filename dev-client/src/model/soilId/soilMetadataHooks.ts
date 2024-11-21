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
import {useDispatch, useSelector} from 'react-redux';

import type {SharedDispatch} from 'terraso-client-shared/store/store';

import {selectSoilMetadata} from 'terraso-mobile-client/model/soilId/soilMetadataSelectors';
import {updateSoilMetadata} from 'terraso-mobile-client/model/soilId/soilMetadataSlice';

export const useSoilIdSelection = (
  siteId: string,
): {
  selectedSoilId?: string;
  selectSoilId: (selectedSoilId: string | null) => Promise<void>;
} => {
  const dispatch = useDispatch<SharedDispatch>();

  const soilMetadata = useSelector(selectSoilMetadata(siteId));
  const selectedSoilId =
    soilMetadata.selectedSoilId === null ||
    soilMetadata.selectedSoilId === undefined
      ? undefined
      : soilMetadata.selectedSoilId;

  const selectSoilId = useCallback(
    (newSelection: string | null) =>
      dispatch(
        updateSoilMetadata({siteId: siteId, selectedSoilId: newSelection}),
      ).then(() => {}),
    [dispatch, siteId],
  );

  return {selectedSoilId, selectSoilId};
};
