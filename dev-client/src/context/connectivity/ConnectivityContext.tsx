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

import {getIsOffline} from 'terraso-mobile-client/context/connectivity/connectivityLogic';

export type ConnectivityContextType = {
  isOffline: boolean | null;
};

export const ConnectivityContext = createContext<ConnectivityContextType>({
  isOffline: null,
});

export const ConnectivityContextProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [isOffline, setIsOffline] = useState<boolean | null>(null);
  const netInfoSubscriptionRef = useRef<NetInfoSubscription | null>(null);

  useEffect(() => {
    const stopMonitoringReachability = () => {
      if (netInfoSubscriptionRef.current) {
        netInfoSubscriptionRef.current?.();
        netInfoSubscriptionRef.current = null;
      }
    };

    const startMonitoringReachability = () => {
      stopMonitoringReachability();

      netInfoSubscriptionRef.current = addEventListener(state => {
        setIsOffline(
          getIsOffline({
            isConnected: state.isConnected,
            isInternetReachable: state.isInternetReachable,
          }),
        );
      });
    };

    if (AppState.currentState === 'active') {
      startMonitoringReachability();
    }

    const appStateListener = AppState.addEventListener('change', state => {
      if (state === 'active') {
        startMonitoringReachability();
      } else {
        stopMonitoringReachability();
      }
    });

    return () => {
      stopMonitoringReachability();
      appStateListener.remove();
    };
  }, []);

  return (
    <ConnectivityContext.Provider value={{isOffline}}>
      {children}
    </ConnectivityContext.Provider>
  );
};
