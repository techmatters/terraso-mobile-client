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

/* As of Sept 2024, the app permissions hooks supplied by the expo libraries don't trigger component updates
 * when app permissions are updated. Instead, the permissions object stays stale until the next call to
 * get() or request().
 * This hook wraps the library-supplied hooks and should cause components to update when permissions are
 * updated in the app via this hook's request(), or after they are updated outside the app.
 * For the hook behavior to be fully correct, all components must use the updated hook, not the expo one.

 * Note: There is an assumption here that the only time the permissions will change is: 
 *   - As a result of calling the context's updated request() method
 *   - While the app state is not "active"
 * If you encounter bugs with this hook, check if these assumptions are still correct.
 */
export type UpdatedPermissionsHookReturnType = [
  PermissionResponse | null, // permission
  () => Promise<PermissionResponse>, // request
  () => Promise<PermissionResponse>, // get
];
export type UpdatedPermissionsHookType = () => UpdatedPermissionsHookReturnType;

export const useUpdatedForegroundPermissions = () => {
  const context = useContext(ForegroundPermissionsContext);

  const [_, request, get] = context;
  // Context provider should have populated this on app launch
  if (request === null || get === null) {
    throw Error(
      'useUpdatedForegroundPermissions must be used within a ForegroundPermissionsContextProvider',
    );
  }
  return context as UpdatedPermissionsHookReturnType;
};
