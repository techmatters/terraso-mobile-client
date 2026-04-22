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

import {useCallback, useContext} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Divider} from 'terraso-mobile-client/components/Divider';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {ConnectivityContext} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {
  selectLastPullTimestamp,
  selectSyncInfoOpen,
} from 'terraso-mobile-client/model/devOnly/devOnlySelectors';
import {setSyncInfoOpen} from 'terraso-mobile-client/model/devOnly/devOnlySlice';
import {
  selectSiteSyncErrorSiteIds,
  selectUnsyncedSiteSiteIds,
} from 'terraso-mobile-client/model/site/siteSelectors';
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
  );
};

const ConnectivityToggle = () => {
  const isOffline = useIsOffline();
  const {isOfflineOverride, setIsOfflineOverride, realIsOffline} =
    useContext(ConnectivityContext);

  const onToggle = useCallback(
    (value: boolean) => {
      setIsOfflineOverride(value ? null : true);
    },
    [setIsOfflineOverride],
  );

  let label: string;
  let color: string;
  if (isOfflineOverride === true) {
    label = 'Forced offline';
    color = '#CC0000';
  } else if (realIsOffline) {
    label = 'No connection';
    color = '#CC0000';
  } else {
    label = 'Online';
    color = '#00AA00';
  }

  return (
    <Row alignItems="center" space="8px">
      <Switch value={!isOffline} onValueChange={onToggle} />
      <Text style={[styles.connectivityStatus, {color}]}>
        {'\u25CF'} {label}
      </Text>
    </Row>
  );
};

const SyncInfoExpanded = () => {
  const {height} = useWindowDimensions();
  return (
    <ScrollView style={[styles.scrollViewContainer, {maxHeight: height / 2}]}>
      <Box margin="8px">
        <Row alignItems="center" justifyContent="space-between">
          <ConnectivityToggle />
          <Row alignItems="center" space="8px">
            <PullButton />
            <PullPending />
            <LastPullTime />
          </Row>
        </Row>
        <Divider style={styles.dividerTopMargin} />
        <PushInfo />
        <SoilIdInfo />
      </Box>
    </ScrollView>
  );
};

const PullPending = () => {
  const pullRequested = useSelector(selectPullRequested);
  if (!pullRequested) {
    return null;
  }
  return <Text>pending...</Text>;
};

const PullButton = ({disabled}: {disabled?: boolean}) => {
  const dispatch = useDispatch();

  const currentUserID = useSelector(selectCurrentUserID);

  const onSync = useCallback(() => {
    if (currentUserID !== undefined) {
      dispatch(setPullRequested(true));
    }
  }, [currentUserID, dispatch]);

  return <ContainedButton onPress={onSync} label="Pull" disabled={disabled} />;
};

const LastPullTime = () => {
  const lastPullTimestamp = useSelector(selectLastPullTimestamp);

  if (lastPullTimestamp === null) {
    return <Text>Never</Text>;
  }

  const date = new Date(lastPullTimestamp);
  const formatted = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return <Text>{formatted}</Text>;
};

const PushInfo = () => {
  const unsyncedSoilDataIds = useSelector(selectUnsyncedSoilDataSiteIds);
  const unsyncedSoilMetadataIds = useSelector(selectUnsyncedMetadataSiteIds);
  const unsyncedSiteIds = useSelector(selectUnsyncedSiteSiteIds);
  const errorSoilDataIds = useSelector(selectSoilDataSyncErrorSiteIds);
  const errorSoilMetadataIds = useSelector(selectMetadataSyncErrorSiteIds);
  const errorSiteIds = useSelector(selectSiteSyncErrorSiteIds);
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
        <Column flex={1}>
          <Text underline>site</Text>
          <SiteNameList siteIds={unsyncedSiteIds} />
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
        <Column flex={1}>
          <Text underline>site</Text>
          <SiteNameList siteIds={errorSiteIds} />
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
  connectivityStatus: {fontWeight: 'bold'},
  dividerTopMargin: {marginTop: 4},
  scrollViewContainer: {flexGrow: 0},
});
