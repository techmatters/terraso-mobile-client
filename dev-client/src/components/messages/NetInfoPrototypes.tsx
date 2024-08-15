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
import {Alert, Text} from 'react-native';

import {useNetInfo} from '@react-native-community/netinfo';

import {useTerrasoBackendNetInfo} from 'terraso-mobile-client/hooks/connectivityHooks';

export const GeneralNetInfoComponent = () => {
  const state = useNetInfo();

  useEffect(() => {
    console.log(
      'Global connection state: ',
      state.isConnected,
      state.isInternetReachable,
      '\n',
      state,
    );

    const connectionStateString = `"isConnected": ${state.isConnected},\n"isInternetReachable": ${state.isInternetReachable},\n"type": ${state.type}`;
    Alert.alert(
      '--------Event happened from UserSettingsScreen ------',
      'General:\n' + connectionStateString,
    );
  }, [state]);

  return (
    <>
      <Text>{`General:\nIsConnected: ${state.isConnected}\nisInternetReachable: ${state.isInternetReachable}`}</Text>
    </>
  );
};

export const BackendNetInfoComponent = () => {
  const backendState = useTerrasoBackendNetInfo().netInfo;

  useEffect(() => {
    console.log(
      'Backend connection state: ',
      backendState.isConnected,
      backendState.isInternetReachable,
      '\n',
      backendState,
    );

    const backendConnectionStateString = `"isConnected": ${backendState.isConnected},\n"isInternetReachable": ${backendState.isInternetReachable},\n"type": ${backendState.type}`;
    Alert.alert(
      '--------Event happened from UserSettingsScreen ------',
      'Backend:\n' + backendConnectionStateString,
    );
  }, [backendState]);

  return (
    <>
      <Text>{`\nBackend:\nIsConnected: ${backendState.isConnected}\nisInternetReachable: ${backendState.isInternetReachable}`}</Text>
    </>
  );
};
