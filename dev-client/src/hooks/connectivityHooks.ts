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

import {useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';

import {
  addEventListener,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export const useIsOffline = () => {
  const [isOffline, setIsOffline] = useState<boolean | null>(false);
  const netInfoSubscriptionRef = useRef<NetInfoSubscription | null>(null);
  // Question: Do we need to use lostConnection as the example? They had it as a ref that would trigger some data refresh
  // TODO: Maybe make this a type that can be "Offline" | "Unknown" | "Connected"

  useEffect(() => {
    const stopMonitoringReachability = () => {
      if (netInfoSubscriptionRef.current) {
        netInfoSubscriptionRef.current?.();
        netInfoSubscriptionRef.current = null;
      }
      // TODO: Should we do setIsOffline(undefined) when we stop monitoring, or just keep it what it last was?
    };

    const startMonitoringReachability = () => {
      stopMonitoringReachability();

      netInfoSubscriptionRef.current = addEventListener(state => {
        // TODO: Remove this
        console.log(
          'Connected =',
          state.isConnected,
          ' | Reachable =',
          state.isInternetReachable,
        );

        // Return null if isConnected is null -- make a test for that cuz
        //   false && null = false
        //   null && false = null
        const isOnline = state.isConnected && state.isInternetReachable;
        setIsOffline(isOnline === null ? null : !isOnline);
      });
    };

    if (AppState.currentState === 'active') {
      startMonitoringReachability();
    }

    console.log('add app state listener');
    const appStateListener = AppState.addEventListener('change', state => {
      if (state === 'active') {
        startMonitoringReachability();
      } else {
        stopMonitoringReachability();
      }
    });

    return () => {
      // Won't this get called when any component that uses this hook gets unmounted? Isn't that more than we want?
      // stopMonitoringReachability();
      console.log('remove app state listener');
      appStateListener.remove();
    };
  }, []);

  return isOffline;
};
