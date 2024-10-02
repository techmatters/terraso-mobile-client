/*
 * Copyright © 2023 Technology Matters
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

import {Button} from 'native-base';

import {fetchSoilDataForUser} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const SyncButton = () => {
  const dispatch = useDispatch();

  const currentUserID = useSelector(
    state => state.account.currentUser?.data?.id,
  );

  const onSync = useCallback(() => {
    if (currentUserID !== undefined) {
      dispatch(fetchSoilDataForUser(currentUserID));
    }
  }, [currentUserID, dispatch]);

  return <Button onPress={onSync}>SYNC</Button>;
};
