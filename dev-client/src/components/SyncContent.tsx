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

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Row, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {
  selectLastPullTimestamp,
  selectSyncInfoOpen,
} from 'terraso-mobile-client/model/devOnly/devOnlySelectors';
import {setSyncInfoOpen} from 'terraso-mobile-client/model/devOnly/devOnlySlice';
import {
  selectSoilDataSyncErrorSiteIds,
  selectUnsyncedSoilDataSiteIds,
} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {
  selectMetadataSyncErrorSiteIds,
  selectUnsyncedMetadataSiteIds,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {selectPullRequested} from 'terraso-mobile-client/model/sync/syncSelectors';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectCurrentUserID} from 'terraso-mobile-client/store/selectors';

// TODO: I expect this to be removed or modified by the time we actually release the offline feature,
// but is helpful for manually testing
export const SyncContent = () => {
  const dispatch = useDispatch();
  const syncInfoOpen = useSelector(selectSyncInfoOpen);

  const toggleSyncInfo = useCallback(() => {
    dispatch(setSyncInfoOpen(!syncInfoOpen));
  }, [dispatch, syncInfoOpen]);

  return (
    <>
      <RestrictByFlag flag="FF_offline">
        <RestrictByFlag flag="FF_testing">
          <ContainedButton
            stretchToFit
            onPress={toggleSyncInfo}
            label={
              syncInfoOpen
                ? 'Close sync info (dev only)'
                : 'Open sync info (dev only)'
            }
          />
          {syncInfoOpen && <SyncInfoExpanded />}
        </RestrictByFlag>
      </RestrictByFlag>
    </>
  );
};

const SyncInfoExpanded = () => {
  return (
    <>
      <Row alignItems="center" justifyContent="space-between" margin="1px">
        <PullButton />
        <PullInfo />
        <LastPullTime />
      </Row>
      <PushInfo />
    </>
  );
};

const PushInfo = () => {
  const unsyncedSoilDataIds = useSelector(selectUnsyncedSoilDataSiteIds);
  const unsyncedSoilMetadataIds = useSelector(selectUnsyncedMetadataSiteIds);
  const errorSoilDataIds = useSelector(selectSoilDataSyncErrorSiteIds);
  const errorSoilMetadataIds = useSelector(selectMetadataSyncErrorSiteIds);
  return (
    <>
      <Text>
        ({unsyncedSoilDataIds.length} soilData |{' '}
        {unsyncedSoilMetadataIds.length} soilMetadata) unsynced
      </Text>
      <Text>
        ({errorSoilDataIds.length} soilData | {errorSoilMetadataIds.length}{' '}
        soilMetadata) sync errors
      </Text>
    </>
  );
};

const PullInfo = () => {
  const pullRequested = useSelector(selectPullRequested);

  const requested = pullRequested ? '\nrequested!' : 'NOT\nrequested';
  return <Text>{`Pull ${requested}`}</Text>;
};

const PullButton = () => {
  const dispatch = useDispatch();

  const currentUserID = useSelector(selectCurrentUserID);

  const onSync = useCallback(() => {
    if (currentUserID !== undefined) {
      dispatch(setPullRequested(true));
    }
  }, [currentUserID, dispatch]);

  return (
    // TODO-offline: Create string in en.json if we actually want this button for reals
    <ContainedButton onPress={onSync} label="Pull" />
  );
};

const LastPullTime = () => {
  const lastPullTimestamp = useSelector(selectLastPullTimestamp);

  if (lastPullTimestamp === null) {
    return <Text>Last pull: Never</Text>;
  }

  const date = new Date(lastPullTimestamp);
  const formatted = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return <Text>{`Last pull:\n${formatted}`}</Text>;
};
