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

import {useContext} from 'react';

import {PermissionResponse} from 'expo-location';

import {ForegroundPermissionsContext} from 'terraso-mobile-client/context/AppPermissionsContext';

// As of Sept 2024, the app permissions hooks supplied by the expo libraries don't trigger component updates
// when app permissions are updated. Instead, the permissions object stays stale until the next call to
// get() or request().
// This hook wraps the library-supplied hooks and should cause components to update when permissions are
// updated in the app or after they are updated outside the app.
export type UpdatedPermissionsHookReturnType = [
  PermissionResponse | null, // permission
  () => Promise<PermissionResponse>, // get
  () => Promise<PermissionResponse>, // request
];
export type UpdatedPermissionsHookType = () => UpdatedPermissionsHookReturnType;

export const useUpdatedForegroundPermissions = () => {
  const context = useContext(ForegroundPermissionsContext);

  const [_, get, request] = context;
  // Context provider should have populated this on app launch
  if (get === null || request === null) {
    throw Error(
      'useUpdatedForegroundPermissions must be used within a ForegroundPermissionsContextProvider',
    );
  }
  return context as UpdatedPermissionsHookReturnType;
};
