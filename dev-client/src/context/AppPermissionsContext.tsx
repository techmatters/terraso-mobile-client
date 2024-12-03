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

import {
  LocationPermissionResponse,
  useForegroundPermissions,
} from 'expo-location';

import {UpdatedPermissionsHookReturnType} from 'terraso-mobile-client/hooks/appPermissionsHooks';
import {useAppState} from 'terraso-mobile-client/hooks/appStateHooks';

export type ForegroundPermissionsType = UpdatedPermissionsHookReturnType | null;

export const ForegroundPermissionsContext =
  createContext<ForegroundPermissionsType>(null);

export const ForegroundPermissionsProvider = ({
  children,
}: React.PropsWithChildren) => {
  const [permissions, request, get] = useForegroundPermissions();
  const [updatedPermissions, setUpdatedPermissions] =
    useState<LocationPermissionResponse | null>(permissions);
  const appState = useAppState();

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
    // If app switches from background to foreground, update permissions in case they changed
    if (!!updatedPermissions && appState === 'active') {
      updatedGet();
    }
    // Don't include updatedPermissions. It'll infinite loop, and it's only here so we don't bother
    // awaiting the get() if nobody has asked about location permissions yet (when it's null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, updatedGet]);

  return (
    <ForegroundPermissionsContext.Provider
      value={{
        permissions: updatedPermissions,
        request: updatedRequest,
        get: updatedGet,
      }}>
      {children}
    </ForegroundPermissionsContext.Provider>
  );
};
