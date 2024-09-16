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

import {useCallback, useEffect, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';

import {
  LocationPermissionResponse,
  requestForegroundPermissionsAsync,
  useForegroundPermissions,
} from 'expo-location';

// The app permissions hooks supplied by the expo libraries don't actually trigger components to update when app permissions are updated.
// The permissions object stays stale until the next call to get() or request().
// This hook wraps the library-supplied hooks and should cause components to update when permissions are updated
export const useUpdatedForegroundPermissions = (): [
  LocationPermissionResponse | null,
  () => Promise<LocationPermissionResponse>,
  () => Promise<LocationPermissionResponse>,
] => {
  const [permissions, get, _] = useForegroundPermissions();
  const [updatedPermissions, setUpdatedPermissions] = useState(permissions); // Move this to context?
  console.log('Calling the hook');

  const updatedGet = useCallback(async () => {
    const response = await get();
    setUpdatedPermissions(response);
    return response;
    // Or should we not return the response here and below to encourage using updatedPermissions instead?
  }, [get, setUpdatedPermissions]);

  const updatedRequest = useCallback(async () => {
    // I don't know why, but calling request() instead of requestForegroundPermissionsAsync() here won't pop the permissions dialog
    console.log('Calling updatedRequest');
    const response = await requestForegroundPermissionsAsync();
    setUpdatedPermissions(response);
    return response;
  }, [setUpdatedPermissions]);

  // TODO: Move this to context so we don't have a bunch of listeners running everywhere
  useEffect(() => {
    console.log('UseEffect to add the event listener');
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        updatedGet();
      }
    };
    // Register listeners
    const appStateListener = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => {
      appStateListener.remove();
    };
  }, [updatedGet]);

  return [updatedPermissions, updatedGet, updatedRequest];
};
