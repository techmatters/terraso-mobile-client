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

import {useNetInfoInstance} from '@react-native-community/netinfo';

import {getAPIConfig} from 'terraso-client-shared/config';

export const terrasoBackendConfig = {
  reachabilityUrl: getAPIConfig().terrasoAPIURL + '/healthz',
  // getAPIConfig().graphQLEndpoint, //This returns true a couple times, but ends on false -- not sure why it would ever return true tbh
  reachabilityTest: async (response: Response) => {
    console.log('Backend response status: ', response.status);
    return response.status === 200;
  },
  reachabilityShortTimeout: 5 * 1000, // 5s
  reachabilityLongTimeout: 60 * 1000, // 60s
  reachabilityRequestTimeout: 15 * 1000, // 15s
  reachabilityShouldRun: () => true,
  shouldFetchWiFiSSID: false, // Assume we don't need this until we do
  useNativeReachability: false, // I think if this is true, it'll do whatever the device does to detect reachability natively, and ignore most of the specified reachability config
};

export const useTerrasoBackendNetInfo = (isPaused: boolean = false) => {
  const {netInfo, refresh} = useNetInfoInstance(isPaused, terrasoBackendConfig);
  return {netInfo, refresh};
};
