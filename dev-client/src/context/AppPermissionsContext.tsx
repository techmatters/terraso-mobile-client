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
import {AppState, AppStateStatus, NativeEventSubscription} from 'react-native';

import {
  LocationPermissionResponse,
  requestForegroundPermissionsAsync,
  useForegroundPermissions,
} from 'expo-location';

export type ForegroundPermissionsType = [
  LocationPermissionResponse | null, // permissions
  (() => Promise<LocationPermissionResponse>) | null, // get
  (() => Promise<LocationPermissionResponse>) | null, // request
];

export const ForegroundPermissionsContext =
  createContext<ForegroundPermissionsType>([null, null, null]);

export const ForegroundPermissionsProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [permissions, get, _] = useForegroundPermissions();
  const [updatedPermissions, setUpdatedPermissions] =
    useState<LocationPermissionResponse | null>(permissions);
  const appStateListener = useRef<NativeEventSubscription | null>(null);
  console.log('Calling the Provider with permissions -->', updatedPermissions);

  const updatedGet = useCallback(async () => {
    console.log('Calling get');
    const response = await get();
    setUpdatedPermissions(response);
    return response;
    // TODO-cknipe: Or should we not return the response here and below to encourage using updatedPermissions instead?
  }, [get, setUpdatedPermissions]);

  const updatedRequest = useCallback(async () => {
    // I don't know why, but calling the request function returned by the library's hook
    // instead of requestForegroundPermissionsAsync() won't pop the permissions dialog
    console.log('Calling updatedRequest');
    const response = await requestForegroundPermissionsAsync();
    setUpdatedPermissions(response);
    return response;
  }, [setUpdatedPermissions]);

  useEffect(() => {
    // Start listening when we first care about location permissions. Listener is a singleton.
    // If we switched from background to foreground, check permissions and update if changed
    if (updatedPermissions && !appStateListener.current) {
      console.log(
        'Gonna add AppState listener (should only happen once? Or once per new permission state??)',
      );
      const onAppStateChange = (state: AppStateStatus) => {
        console.log('App state changed to', state);
        if (state === 'active') {
          updatedGet();
        }
      };

      appStateListener.current = AppState.addEventListener(
        'change',
        onAppStateChange,
      );

      return () => {
        console.log('Destroying AppState listener');
        appStateListener.current?.remove();
      };
    }
  }, [updatedGet, updatedPermissions]);

  return (
    <ForegroundPermissionsContext.Provider
      value={[updatedPermissions, updatedGet, updatedRequest]}>
      {children}
    </ForegroundPermissionsContext.Provider>
  );
};
