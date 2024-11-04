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

import {useEffect} from 'react';

import {useDebounce} from 'use-debounce';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {pushSoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const PushDispatcher = () => {
  const dispatch = useDispatch();

  /* Debounce both offline state and IDs so we have a stable state before queuing up a push */
  const [isOffline] = useDebounce(useIsOffline(), 500);
  const [siteIds] = useDebounce(useSelector(selectUnsyncedSiteIds), 500);

  /* We need to push if there is a logged-in user, we are online, and we have unsynced site IDs */
  const currentUser = useSelector(state => state.account.currentUser.data);
  const needsPush = currentUser && !isOffline && siteIds.length > 0;

  useEffect(() => {
    if (needsPush) {
      dispatch(pushSoilData(siteIds));
    }
  }, [dispatch, needsPush, siteIds]);

  return <></>;
};
