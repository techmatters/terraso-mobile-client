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

import {useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking} from 'react-native';

import {createPermissionHook} from 'expo-modules-core';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {UpdatedPermissionsHookType} from 'terraso-mobile-client/hooks/appPermissionsHooks';

type PermissionHook = ReturnType<typeof createPermissionHook>;
type PermissionResponse = ReturnType<PermissionHook>[0];
type RequestPermissionMethod = ReturnType<PermissionHook>[1];

type UpdatedProps = Omit<ImplProps, 'permissions' | 'requestPermissions'> & {
  permissionHook: UpdatedPermissionsHookType;
};

export const UpdatedPermissionsRequestWrapper = ({
  requestModalTitle,
  requestModalBody,
  permissionHook: usePermissions,
  permissionedAction,
  children,
}: UpdatedProps) => {
  const {permissions, request} = usePermissions();
  return (
    <PermissionsRequestWrapperImpl
      requestModalTitle={requestModalTitle}
      requestModalBody={requestModalBody}
      permissionedAction={permissionedAction}
      children={children}
      permissions={permissions}
      requestPermissions={request}
    />
  );
};

type Props = Omit<ImplProps, 'permissions' | 'requestPermissions'> & {
  permissionHook: PermissionHook;
};
// Issue #1749: Prefer to use one of our own "updated" app permissions hooks (or create one using this)
// The updated permissions hooks are a first step to have a more reactive interface with permissions.
// Otherwise, the permissions could be outdated if:
// a) nobody has done a "get" or "request" on them since they changed, or
// b) a descendant component did the "get" or "request", so there is no reason for the given component to re-render
export const PermissionsRequestWrapper = ({
  requestModalTitle,
  requestModalBody,
  permissionHook: usePermissions,
  permissionedAction,
  children,
}: Props) => {
  const [permissions, requestPermissions] = usePermissions();
  return (
    <PermissionsRequestWrapperImpl
      requestModalTitle={requestModalTitle}
      requestModalBody={requestModalBody}
      permissionedAction={permissionedAction}
      children={children}
      permissions={permissions}
      requestPermissions={requestPermissions}
    />
  );
};

type ImplProps = {
  requestModalTitle: string;
  requestModalBody: string;
  permissions: PermissionResponse | null;
  requestPermissions: RequestPermissionMethod;
  permissionedAction?: () => void;
  children: (onOpen: () => void) => React.ReactNode;
};

const PermissionsRequestWrapperImpl = ({
  requestModalTitle,
  requestModalBody,
  permissionedAction,
  permissions,
  requestPermissions,
  children,
}: ImplProps) => {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);

  const onRequestAction = useCallback(async () => {
    if (permissions === null) {
      return;
    }

    if (permissions.granted) {
      if (permissionedAction !== undefined) {
        permissionedAction();
      }
    } else if (permissions.canAskAgain && requestPermissions) {
      const result = await requestPermissions();
      if (result.granted && permissionedAction !== undefined) {
        permissionedAction();
      }
    } else {
      ref.current?.onOpen();
    }
  }, [permissionedAction, permissions, requestPermissions]);

  return (
    <>
      <ConfirmModal
        ref={ref}
        isConfirmError={false}
        actionName={t('general.open_settings')}
        title={requestModalTitle}
        body={requestModalBody}
        handleConfirm={Linking.openSettings}
      />
      {children(onRequestAction)}
    </>
  );
};
