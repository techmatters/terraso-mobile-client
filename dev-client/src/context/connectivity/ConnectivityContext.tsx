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

import {createContext, useCallback, useEffect, useRef, useState} from 'react';

import {
  addEventListener,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

import {getIsOffline} from 'terraso-mobile-client/context/connectivity/connectivityLogic';
import {useAppState} from 'terraso-mobile-client/hooks/appStateHooks';

export type ConnectivityContextType = {
  isOffline: boolean | null;
  isOfflineOverride: boolean | null;
  setIsOfflineOverride: (value: boolean | null) => void;
};

const noopSetOverride = () => {};

export const ConnectivityContext = createContext<ConnectivityContextType>({
  isOffline: null,
  isOfflineOverride: null,
  setIsOfflineOverride: noopSetOverride,
});

export const ConnectivityContextProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [realIsOffline, setRealIsOffline] = useState<boolean | null>(null);
  const [isOfflineOverride, setIsOfflineOverride] = useState<boolean | null>(
    null,
  );
  const netInfoSubscriptionRef = useRef<NetInfoSubscription | null>(null);
  const appState = useAppState();

  const isOffline =
    isOfflineOverride !== null ? isOfflineOverride : realIsOffline;

  const stopMonitoringReachability = useCallback(() => {
    if (netInfoSubscriptionRef.current) {
      netInfoSubscriptionRef.current?.();
      netInfoSubscriptionRef.current = null;
    }
  }, [netInfoSubscriptionRef]);

  const startMonitoringReachability = useCallback(() => {
    stopMonitoringReachability();

    netInfoSubscriptionRef.current = addEventListener(state => {
      setRealIsOffline(
        getIsOffline({
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
        }),
      );
    });
  }, [netInfoSubscriptionRef, stopMonitoringReachability]);

  useEffect(() => {
    appState === 'active'
      ? startMonitoringReachability()
      : stopMonitoringReachability();

    return stopMonitoringReachability;
  }, [appState, startMonitoringReachability, stopMonitoringReachability]);

  return (
    <ConnectivityContext.Provider
      value={{isOffline, isOfflineOverride, setIsOfflineOverride}}>
      {children}
    </ConnectivityContext.Provider>
  );
};
