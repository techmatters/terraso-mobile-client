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

import Constants from 'expo-constants';

import {
  checkNativeSessionReplayStatus,
  useFeatureFlagPollingContext,
  useSessionRecordingState,
} from 'terraso-mobile-client/app/posthog/PostHog';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Divider} from 'terraso-mobile-client/components/Divider';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
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
  const [isRefetching, setIsRefetching] = useState(false);

  // Get session recording state (including config) from context
  const sessionRecordingState = useSessionRecordingState();

  // Get polling context to trigger refresh
  const pollingContext = useFeatureFlagPollingContext();

  // Get current user email
  const currentUser = useSelector(state => state.account?.currentUser?.data);
  const email = currentUser?.email ?? '(not logged in)';

  // Get build number
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();

  // Load native session replay status on mount
  useEffect(() => {
    checkNativeSessionReplayStatus().then(setNativeStatus);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefetching(true);

    // Trigger polling cycle with force=true to bypass debouncing
    pollingContext?.trigger(true);

    // Wait a moment for the fetch to complete
    setTimeout(() => {
      setIsRefetching(false);
    }, 2000);
  }, [pollingContext]);

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

        {/* Config (from Cloudflare) */}
        <Text bold mt="8px">
          Config
        </Text>
        <Column>
          <Text>
            enabledBuilds:{' '}
            {sessionRecordingState?.config?.enabledBuilds
              ? JSON.stringify(sessionRecordingState.config.enabledBuilds)
              : 'none'}
          </Text>
          <Text>
            enabledEmails:{' '}
            {sessionRecordingState?.config?.enabledEmails
              ? JSON.stringify(sessionRecordingState.config.enabledEmails)
              : 'none'}
          </Text>
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
          {sessionRecordingState &&
            sessionRecordingState.wantRecording !==
              sessionRecordingState.isRecording && (
              <Text color="orange.600">
                ⚠ Restart required to apply changes
              </Text>
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
