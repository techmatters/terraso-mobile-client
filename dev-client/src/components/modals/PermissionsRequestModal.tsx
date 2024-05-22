import {useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {Linking} from 'react-native';

import {createPermissionHook} from 'expo-modules-core';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';

type PermissionHook = ReturnType<typeof createPermissionHook>;

type Props = {
  title: string;
  body: string;
  usePermissions: PermissionHook;
  permissionedAction?: () => void;
  children: (onOpen: () => void) => React.ReactNode;
};

export const PermissionsRequestModal = ({
  title,
  body,
  usePermissions,
  permissionedAction,
  children,
}: Props) => {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);
  const [permissions, requestPermissions] = usePermissions();

  const onRequestAction = useCallback(async () => {
    if (permissions === null) {
      return;
    }

    if (permissions.granted) {
      if (permissionedAction !== undefined) {
        permissionedAction();
      }
    } else if (permissions.canAskAgain) {
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
        title={title}
        body={body}
        handleConfirm={Linking.openSettings}
      />
      {children(onRequestAction)}
    </>
  );
};
