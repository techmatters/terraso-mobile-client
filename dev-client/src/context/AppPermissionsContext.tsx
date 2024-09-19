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

import {createContext, useCallback, useEffect, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';

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

  const updatedRequest = useCallback(async () => {
    const response = await request();
    setUpdatedPermissions(response);
    return response;
  }, [request, setUpdatedPermissions]);

  const updatedGet = useCallback(async () => {
    const response = await get();
    setUpdatedPermissions(response);
    return response;
  }, [get, setUpdatedPermissions]);

  useEffect(() => {
    // Don't start listening until someone asks about location permissions.
    //   updatedPermissions will only be non-null if permissions have been gotten/requested so far
    //   For this to be fully correct, all components must use the updated hook, rather than useForegroundPermissions

    if (updatedPermissions) {
      // If app switches from background to foreground, update permissions in case they changed
      const onAppStateChange = async (state: AppStateStatus) => {
        if (state === 'active') {
          updatedGet();
        }
      };
      const appStateListener = AppState.addEventListener(
        'change',
        onAppStateChange,
      );

      return () => {
        appStateListener.remove();
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
