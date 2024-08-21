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

import {useCallback, useEffect, useState} from 'react';
import {Alert} from 'react-native';

import {fetch, NetInfoState, useNetInfo} from '@react-native-community/netinfo';
import {Button, Divider} from 'native-base';

import {
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  useIsOffline,
  useTerrasoBackendNetInfo,
} from 'terraso-mobile-client/hooks/connectivityHooks';

// Prototype 1: Using a hook to get netinfo regularly
export const SingletonGeneralNetInfo = () => {
  const state = useNetInfo();

  useEffect(() => {
    console.log(
      'Global state event: ',
      state.isConnected,
      state.isInternetReachable,
    );

    const connectionStateString = `"isConnected": ${state.isConnected},\n"isInternetReachable": ${state.isInternetReachable},\n"type": ${state.type}`;
    Alert.alert(
      '--------Event on UserSettingsScreen ------',
      `General:\n${connectionStateString}`,
    );
  }, [state]);

  return (
    <>
      <Text>{`General:\nisConnected = ${state.isConnected}\nisInternetReachable = ${state.isInternetReachable}`}</Text>
    </>
  );
};

export const IsolatedBackendNetInfo = () => {
  const backendState = useTerrasoBackendNetInfo().netInfo;

  useEffect(() => {
    console.log(
      'Backend state event: ',
      backendState.isConnected,
      backendState.isInternetReachable,
    );

    const backendConnectionStateString = `"isConnected": ${backendState.isConnected},\n"isInternetReachable": ${backendState.isInternetReachable},\n"type": ${backendState.type}`;
    Alert.alert(
      '--------Event on UserSettingsScreen ------',
      `General:\n${backendConnectionStateString}`,
    );
  }, [backendState]);

  return (
    <>
      <Text>{`\nBackend:\nisConnected = ${backendState.isConnected}\nisInternetReachable = ${backendState.isInternetReachable}`}</Text>
    </>
  );
};

// Prototype 2: Fetching netinfo on demand

// Uncomment this if you want the singleton to only check backend reachability... which is admittedly a weird move
// configure(terrasoBackendConfig);

export const FetchSingletonGeneralNetInfoZone = () => {
  // This uses a singleton network state manager.
  // It can be configured to check on a particular server, but for now we are using its defaults,
  // which will check general internet reachability using the device's native way of doing so.
  const [netInfo, setNetInfo] = useState<NetInfoState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSingletonNetInfo = useCallback(async () => {
    setLoading(true);
    fetch()
      .then(state => {
        console.log(
          `Fetched: ${state.isConnected} ${state.isInternetReachable}`,
        );
        setNetInfo(state);
      })
      .catch(() => {
        console.log('Error fetching netInfo');
        setNetInfo(null);
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <Text>{`General isInternetReachable? ${netInfo?.isInternetReachable} -- ${loading ? 'Loading...' : ''}`}</Text>
      <Button onPress={fetchSingletonNetInfo}>Fetch Netinfo</Button>
    </>
  );
};

// Prototype 3: "You're offline" text using addEventListener
export const OfflineTextDisplay = () => {
  const isOffline = useIsOffline();

  return (
    <Text>{`${
      isOffline === null
        ? 'NULL'
        : isOffline
          ? 'Offline'
          : 'Internet reachable!'
    }`}</Text>
  );
};

export const LoggingButton = () => {
  return (
    <Button onPress={() => console.log('-------------')}>
      Press me to log "-------------"
    </Button>
  );
};

// Except OfflineBanner, which is in the ScreenScaffold
export const AllNetInfoPrototypes = () => {
  return (
    <Column marginTop={10}>
      <SingletonGeneralNetInfo />
      <IsolatedBackendNetInfo />
      <Divider marginTop={3} />
      <FetchSingletonGeneralNetInfoZone />
      <Divider marginTop={3} marginBottom={3} />
      <OfflineTextDisplay />
      <Divider marginTop={3} marginBottom={3} />
      <LoggingButton />
    </Column>
  );
};
