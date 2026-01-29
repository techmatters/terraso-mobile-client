/*
 * Copyright © 2026 Technology Matters
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

import {useCallback, useEffect, useState} from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {Divider} from 'react-native-paper';

import Constants from 'expo-constants';

import {
  checkNativeSessionReplayStatus,
  getCachedPayload,
  useFeatureFlagPollingContext,
  useSessionRecordingState,
} from 'terraso-mobile-client/app/PostHog';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useSelector} from 'terraso-mobile-client/store';

// This component is helpful for debugging session replay issues,
// but is not intended to be shown to real users
export const SessionReplayDebugContent = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <>
      <RestrictByFlag flag="FF_testing">
        <ContainedButton
          stretchToFit
          onPress={toggleOpen}
          label={
            isOpen
              ? 'Close session replay info (dev only)'
              : 'Open session replay info (dev only)'
          }
        />
        {isOpen && <SessionReplayDebugExpanded />}
      </RestrictByFlag>
    </>
  );
};

const SessionReplayDebugExpanded = () => {
  const {height} = useWindowDimensions();
  const [nativeStatus, setNativeStatus] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefetching, setIsRefetching] = useState(false);
  const [cachedConfig, setCachedConfig] = useState(() => getCachedPayload());

  // Get polling context to trigger refresh
  const pollingContext = useFeatureFlagPollingContext();

  // Determine config source
  const useCloudflare =
    !!APP_CONFIG.featureFlagUrl && !!APP_CONFIG.featureFlagSecret;
  const configSource = useCloudflare ? 'Cloudflare' : 'PostHog';

  // Get current user email
  const currentUser = useSelector(state => state.account?.currentUser?.data);
  const email = currentUser?.email ?? '(not logged in)';

  // Get build number
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();

  // Load native session replay status
  useEffect(() => {
    checkNativeSessionReplayStatus().then(setNativeStatus);
  }, [refreshKey]);

  const handleRefresh = useCallback(() => {
    setIsRefetching(true);
    setRefreshKey(prev => prev + 1);

    // Trigger polling cycle - this will fetch from Cloudflare and update wantRecording
    pollingContext?.trigger();

    // Wait a moment for the fetch to complete, then reload cached config
    setTimeout(() => {
      setCachedConfig(getCachedPayload());
      setIsRefetching(false);
    }, 2000);
  }, [pollingContext]);

  // Get session recording state from context
  const sessionRecordingState = useSessionRecordingState();

  return (
    <ScrollView style={[styles.scrollViewContainer, {maxHeight: height / 2}]}>
      <Box margin="8px">
        <Row alignItems="center" justifyContent="space-between">
          <Text bold>Session Replay Debug</Text>
          <ContainedButton
            onPress={handleRefresh}
            label={isRefetching ? 'Refreshing...' : 'Refresh'}
            disabled={isRefetching}
          />
        </Row>

        <Divider style={styles.dividerTopMargin} />

        {/* Current User & Build */}
        <Text bold mt="8px">
          Current User & Build
        </Text>
        <Column>
          <Text>Email: {email}</Text>
          <Text>Build Number: {buildNumber ?? 'unknown'}</Text>
        </Column>

        <Divider style={styles.dividerTopMargin} />

        {/* Session Recording State */}
        <Text bold mt="8px">
          Session Recording State
        </Text>
        <Column>
          <Text>
            isRecording (at startup):{' '}
            {sessionRecordingState?.isRecording === undefined
              ? 'undefined'
              : String(sessionRecordingState.isRecording)}
          </Text>
          <Text>
            wantRecording (current):{' '}
            {sessionRecordingState?.wantRecording === undefined
              ? 'undefined'
              : String(sessionRecordingState.wantRecording)}
          </Text>
          <Text>
            Native replay active:{' '}
            {nativeStatus === null ? 'checking...' : String(nativeStatus)}
          </Text>
        </Column>

        <Divider style={styles.dividerTopMargin} />

        {/* Config Source & Cached Config */}
        <Text bold mt="8px">
          Config Source: {configSource}
        </Text>
        <Column>
          <Text>
            enabledBuilds:{' '}
            {cachedConfig?.payload?.enabledBuilds
              ? JSON.stringify(cachedConfig.payload.enabledBuilds)
              : 'none'}
          </Text>
          <Text>
            enabledEmails:{' '}
            {cachedConfig?.payload?.enabledEmails
              ? JSON.stringify(cachedConfig.payload.enabledEmails)
              : 'none'}
          </Text>
          {!useCloudflare && (
            <Text>sequence: {cachedConfig?.sequence ?? 'none'}</Text>
          )}
        </Column>

        <Divider style={styles.dividerTopMargin} />

        {/* Diagnosis */}
        <Text bold mt="8px">
          Diagnosis
        </Text>
        <Column>
          {nativeStatus === true && (
            <Text color="green.600">✓ Native session replay is ACTIVE</Text>
          )}
          {nativeStatus === false && !sessionRecordingState?.isRecording && (
            <Text color="gray.600">
              Session recording disabled (not matching criteria)
            </Text>
          )}
          {sessionRecordingState?.isRecording && nativeStatus === false && (
            <Text color="orange.600">
              ⚠ isRecording=true but native is inactive
            </Text>
          )}
          {sessionRecordingState?.showRestartBanner && (
            <Text color="orange.600">⚠ Restart required to apply changes</Text>
          )}
        </Column>
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dividerTopMargin: {marginTop: 4},
  scrollViewContainer: {flexGrow: 0},
});
