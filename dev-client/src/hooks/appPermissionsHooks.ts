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

// The app permissions hooks supplied by the expo libraries don't actually trigger components to update when app permissions are updated.
// The permissions object stays stale until the next call to get() or request().
// This hook wraps the library-supplied hooks and should cause components to update when permissions are updated

// TODO: Ok but how do make them not null because at this point they won't be
// Otherwise we're trying as closely as we can to match ReturnType<ReturnType<typeof createPermissionHook>
export type UpdatedPermissionsHookReturnType = [
  PermissionResponse | null,
  (() => Promise<PermissionResponse>) | null,
  (() => Promise<PermissionResponse>) | null,
];
export type UpdatedPermissionsHookType = () => UpdatedPermissionsHookReturnType;

export const useUpdatedForegroundPermissions =
  (): UpdatedPermissionsHookReturnType => {
    const {permissions, get, request} = useContext(
      ForegroundPermissionsContext,
    );
    return [permissions, get, request];
  };
