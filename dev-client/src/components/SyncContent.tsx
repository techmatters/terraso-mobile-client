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
import {ScrollView, StyleSheet, useWindowDimensions} from 'react-native';
import {Divider} from 'react-native-paper';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
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
import {selectSitesWithSoilIdStatus} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSelectors';
import {
  selectMetadataSyncErrorSiteIds,
  selectUnsyncedMetadataSiteIds,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {selectPullRequested} from 'terraso-mobile-client/model/sync/syncSelectors';
import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  selectCurrentUserID,
  selectSites,
} from 'terraso-mobile-client/store/selectors';

// This component is helpful for manually testing,
// but is not intended to be shown to real users
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
  const {height} = useWindowDimensions();
  return (
    <ScrollView style={[styles.scrollViewContainer, {maxHeight: height / 2}]}>
      <Box margin="8px">
        <Row alignItems="center" justifyContent="space-between">
          <PullButton />
          <PullInfo />
          <LastPullTime />
        </Row>
        <Divider style={styles.dividerTopMargin} />
        <PushInfo />
        <SoilIdInfo />
      </Box>
    </ScrollView>
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

const PushInfo = () => {
  const unsyncedSoilDataIds = useSelector(selectUnsyncedSoilDataSiteIds);
  const unsyncedSoilMetadataIds = useSelector(selectUnsyncedMetadataSiteIds);
  const errorSoilDataIds = useSelector(selectSoilDataSyncErrorSiteIds);
  const errorSoilMetadataIds = useSelector(selectMetadataSyncErrorSiteIds);
  return (
    <>
      <Text bold>Unsynced</Text>
      <Row>
        <Column flex={1}>
          <Text underline>soilData</Text>
          <SiteNameList siteIds={unsyncedSoilDataIds} />
        </Column>
        <Column flex={1}>
          <Text underline>soilMetadata</Text>
          <SiteNameList siteIds={unsyncedSoilMetadataIds} />
        </Column>
      </Row>
      <Text bold>Sync errors</Text>
      <Row>
        <Column flex={1}>
          <Text underline>soilData</Text>
          <SiteNameList siteIds={errorSoilDataIds} />
        </Column>
        <Column flex={1}>
          <Text underline>soilMetadata</Text>
          <SiteNameList siteIds={errorSoilMetadataIds} />
        </Column>
      </Row>
    </>
  );
};

const SiteNameList = ({siteIds}: {siteIds: string[]}) => {
  const sites = useSelector(selectSites);
  if (siteIds.length === 0) {
    return <Text>None</Text>;
  }
  return (
    <>
      {siteIds.map(id => (
        <Text key={id}>• {sites[id]?.name ?? id}</Text>
      ))}
    </>
  );
};

const SoilIdInfo = () => {
  const sitesAndSoilIdStatus = useSelector(selectSitesWithSoilIdStatus);
  const sitesLoadingSoilId = Object.entries(sitesAndSoilIdStatus)
    .filter(([_, value]) => value === 'loading')
    .map(([siteId, _]) => siteId);
  return (
    <>
      <Text bold>Sites loading Soil ID</Text>
      <SiteNameList siteIds={sitesLoadingSoilId} />
    </>
  );
};

const styles = StyleSheet.create({
  dividerTopMargin: {marginTop: 4},
  scrollViewContainer: {flexGrow: 0},
});
