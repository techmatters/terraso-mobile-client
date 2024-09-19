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
  useForegroundPermissions,
} from 'expo-location';

export type ForegroundPermissionsType = [
  LocationPermissionResponse | null, // permissions
  (() => Promise<LocationPermissionResponse>) | null, // request
  (() => Promise<LocationPermissionResponse>) | null, // get
];

export const ForegroundPermissionsContext =
  createContext<ForegroundPermissionsType>([null, null, null]);

export const ForegroundPermissionsProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [permissions, request, get] = useForegroundPermissions();
  const [updatedPermissions, setUpdatedPermissions] =
    useState<LocationPermissionResponse | null>(permissions);
  const appStateListener = useRef<NativeEventSubscription | null>(null); // Do we still need a ref for this?
  console.log('---- Permissions Provider re-rendering ----');

  const updatedRequest = useCallback(async () => {
    const response = await request();
    console.log('    Calling updatedRequest(), got', response.status);
    setUpdatedPermissions(response);
    return response;
  }, [request, setUpdatedPermissions]);

  const updatedGet = useCallback(async () => {
    const response = await get();
    console.log('    Called updatedGet(), got', response.status);
    setUpdatedPermissions(response);
    return response;
  }, [get, setUpdatedPermissions]);

  useEffect(() => {
    console.log(
      'Considering adding a new app state listener... --> updatedPermissions',
      updatedPermissions?.status,
    );
    // Don't start listening until someone asks about location permissions. Listener is a singleton.
    // If we switched from background to foreground, update permissions in case they changed
    if (updatedPermissions && !appStateListener.current) {
      console.log('YES, add AppState listener');

      const onAppStateChange = async (state: AppStateStatus) => {
        console.log('App state changed to', state);
        if (state === 'active') {
          console.log('    Calling updatedGet()');
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
        appStateListener.current = null;
      };
    }
  }, [updatedGet, updatedPermissions]);

  return (
    <ForegroundPermissionsContext.Provider
      value={[updatedPermissions, updatedRequest, updatedGet]}>
      {children}
    </ForegroundPermissionsContext.Provider>
  );
};
