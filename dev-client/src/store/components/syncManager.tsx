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

import {useDispatch, useSelector} from '..';
import {useDebounce} from 'use-debounce';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {pushSoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';

export const SyncManager = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.account.currentUser.data);
  const isOffline = useIsOffline();
  const unsyncedSiteIds = useSelector(selectUnsyncedSiteIds);

  /* Debounce both offline state and IDs so we have a stable state before queuing up a sync */
  const [debouncedIsOffline] = useDebounce(isOffline, 500);
  const [debouncedSiteIds] = useDebounce(unsyncedSiteIds, 500);

  useEffect(() => {
    /* If we're not offline and have unsynced site IDs, dispatch a sync all for them */
    if (currentUser && !debouncedIsOffline && debouncedSiteIds.length > 0) {
      dispatch(pushSoilData(debouncedSiteIds));
    }
  }, [dispatch, currentUser, debouncedIsOffline, debouncedSiteIds]);

  return <></>;
};
