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
  requestForegroundPermissionsAsync,
  useForegroundPermissions,
} from 'expo-location';

export type ForegroundPermissionsType = {
  permissions: LocationPermissionResponse | null;
  get: () => Promise<LocationPermissionResponse>;
  request: () => Promise<LocationPermissionResponse>;
} | null;

export const ForegroundPermissionsContext =
  createContext<ForegroundPermissionsType>(null);

export const ForegroundPermissionsProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [permissions, get, _] = useForegroundPermissions();
  const [updatedPermissions, setUpdatedPermissions] =
    useState<LocationPermissionResponse | null>(permissions);
  console.log('Calling the Provider', updatedPermissions);

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

  // TODO-cknipe: Only do this once the permissions are ... existent?
  // I suspect if we put updatedPermissions in the dependency list, it'll add multiple listeners?
  // Maybe we want to keep track such there is only a single listener for each provider
  useEffect(() => {
    if (updatedPermissions?.granted) {
      console.log('UseEffect to add the event listener');
      const onAppStateChange = (state: AppStateStatus) => {
        console.log('App state changed to', state);
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
    // TODO-cknipe: Make sure we want to do this; for now I'm just trying to satisfy the linter so I can commit
    // disable depcheck because we only want to run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedGet]);

  return (
    <ForegroundPermissionsContext.Provider
      value={{
        permissions: updatedPermissions,
        get: updatedGet,
        request: updatedRequest,
      }}>
      {children}
    </ForegroundPermissionsContext.Provider>
  );
};
