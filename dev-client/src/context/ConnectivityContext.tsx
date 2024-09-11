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

import {createContext, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';

import {
  addEventListener,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export type ConnectivityContextType = {
  isOffline: boolean | null;
  setIsOffline: (newValue: boolean | null) => void;
};

export const ConnectivityContext =
  createContext<ConnectivityContextType | null>(null);

export const ConnectivityContextProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const netInfoSubscriptionRef = useRef<NetInfoSubscription | null>(null);
  console.log('re-render ConnectivityContextProvider');

  useEffect(() => {
    console.log('setup reachability monitoring');

    const stopMonitoringReachability = () => {
      if (netInfoSubscriptionRef.current) {
        netInfoSubscriptionRef.current?.();
        netInfoSubscriptionRef.current = null;
      }
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

        // TODO: make a test for this cuz
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
      console.log('remove app state listener');
      stopMonitoringReachability();
      appStateListener.remove();
    };
  }, []);

  return (
    <ConnectivityContext.Provider value={{isOffline, setIsOffline}}>
      {children}
    </ConnectivityContext.Provider>
  );
};
