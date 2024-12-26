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

import {Button} from 'native-base';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {selectPullRequested} from 'terraso-mobile-client/model/sync/syncSelectors';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectCurrentUserID} from 'terraso-mobile-client/store/selectors';

// TODO: I expect this to be removed or modified by the time we actually release the offline feature,
// but is helpful for manually testing
export const SyncContent = () => {
  return (
    <>
      <RestrictByFlag flag="FF_offline">
        <SyncButton />
        <PullInfo />
        <PushInfo />
      </RestrictByFlag>
    </>
  );
};

export const PushInfo = () => {
  const unsyncedIds = useSelector(selectUnsyncedSiteIds);
  return <Text>({unsyncedIds.length} changed sites)</Text>;
};

export const PullInfo = () => {
  const pullRequested = useSelector(selectPullRequested);

  const requested = pullRequested ? 'requested' : 'not requested';
  return (
    <>
      <Text>{`* Pull ${requested}`}</Text>
    </>
  );
};

export const SyncButton = () => {
  const dispatch = useDispatch();

  const currentUserID = useSelector(selectCurrentUserID);

  const onSync = useCallback(() => {
    if (currentUserID !== undefined) {
      dispatch(setPullRequested(true));
    }
  }, [currentUserID, dispatch]);

  return (
    // TODO-offline: Create string in en.json if we actually want this button for reals
    <Button onPress={onSync}>SYNC: pull</Button>
  );
};
