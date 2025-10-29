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

import {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking} from 'react-native';

import {createPermissionHook} from 'expo-modules-core';

import {usePostHog} from 'posthog-react-native';

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
  const [isRequesting, setIsRequesting] = useState(false);
  const posthog = usePostHog();

  const onRequestAction = useCallback(async () => {
    console.log('[PermissionsRequestWrapper] onRequestAction called', {
      permissions,
      isRequesting,
    });

    posthog?.capture('permission_wrapper_action_requested', {
      permission_type: requestModalTitle,
      permissions_state:
        permissions === null
          ? 'null'
          : permissions.granted
            ? 'granted'
            : 'not_granted',
      can_ask_again: permissions?.canAskAgain ?? false,
      is_requesting: isRequesting,
      timestamp: new Date().toISOString(),
    });

    // Prevent multiple simultaneous permission requests
    if (isRequesting) {
      console.log(
        '[PermissionsRequestWrapper] Already requesting permission, ignoring tap',
      );
      posthog?.capture('permission_wrapper_duplicate_request_blocked', {
        permission_type: requestModalTitle,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // If permissions haven't loaded yet, request them
    if (permissions === null) {
      console.log(
        '[PermissionsRequestWrapper] Permissions null, requesting...',
      );
      setIsRequesting(true);
      posthog?.capture('permission_wrapper_requesting_null_permissions', {
        permission_type: requestModalTitle,
        timestamp: new Date().toISOString(),
      });
      try {
        const result = await requestPermissions();
        console.log(
          '[PermissionsRequestWrapper] Permission result:',
          result.granted,
        );
        posthog?.capture('permission_wrapper_request_result', {
          permission_type: requestModalTitle,
          granted: result.granted,
          timestamp: new Date().toISOString(),
        });
        if (result.granted && permissionedAction !== undefined) {
          permissionedAction();
        }
      } finally {
        setIsRequesting(false);
      }
      return;
    }

    if (permissions.granted) {
      console.log(
        '[PermissionsRequestWrapper] Permissions already granted, executing action',
      );
      posthog?.capture('permission_wrapper_already_granted', {
        permission_type: requestModalTitle,
        timestamp: new Date().toISOString(),
      });
      if (permissionedAction !== undefined) {
        permissionedAction();
      }
    } else if (permissions.canAskAgain && requestPermissions) {
      console.log('[PermissionsRequestWrapper] Can ask again, requesting...');
      setIsRequesting(true);
      posthog?.capture('permission_wrapper_can_ask_again', {
        permission_type: requestModalTitle,
        timestamp: new Date().toISOString(),
      });
      try {
        const result = await requestPermissions();
        console.log(
          '[PermissionsRequestWrapper] Permission result:',
          result.granted,
        );
        posthog?.capture('permission_wrapper_request_result', {
          permission_type: requestModalTitle,
          granted: result.granted,
          timestamp: new Date().toISOString(),
        });
        if (result.granted && permissionedAction !== undefined) {
          permissionedAction();
        }
      } finally {
        setIsRequesting(false);
      }
    } else {
      console.log(
        '[PermissionsRequestWrapper] Cannot ask again, opening settings modal',
      );
      posthog?.capture('permission_wrapper_opening_settings', {
        permission_type: requestModalTitle,
        timestamp: new Date().toISOString(),
      });
      ref.current?.onOpen();
    }
  }, [
    permissionedAction,
    permissions,
    requestPermissions,
    isRequesting,
    requestModalTitle,
    posthog,
  ]);

  return (
    <>
      <ConfirmModal
        ref={ref}
        destructive={false}
        actionLabel={t('general.open_settings')}
        title={requestModalTitle}
        body={requestModalBody}
        handleConfirm={Linking.openSettings}
      />
      {children(onRequestAction)}
    </>
  );
};
