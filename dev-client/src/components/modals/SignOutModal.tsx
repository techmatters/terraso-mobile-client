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

import {useCallback, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {signOut} from 'terraso-client-shared/account/accountSlice';

import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {ActionsModal} from 'terraso-mobile-client/components/modals/ActionsModal';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  ModalHandle,
  ModalProps,
} from 'terraso-mobile-client/components/modals/Modal';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useDispatch} from 'terraso-mobile-client/store';
import {userLoggedOut} from 'terraso-mobile-client/store/logoutActions';
import {useUnsyncedSiteIds} from 'terraso-mobile-client/store/sync/hooks/syncHooks';

export type LogoutModalProps = Pick<ModalProps, 'trigger'>;

export function SignOutModal({trigger}: LogoutModalProps) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const unsyncedSiteIds = useUnsyncedSiteIds();
  const hasUnsyncedChanges = unsyncedSiteIds.length > 0;

  const onSignOut = useCallback(() => {
    dispatch(userLoggedOut());
    dispatch(signOut());
  }, [dispatch]);

  if (hasUnsyncedChanges) {
    return <SignOutBlockedModal trigger={trigger} />;
  }

  return (
    <ConfirmModal
      trigger={trigger}
      body={t('sign_out.confirm_body')}
      actionLabel={t('sign_out.confirm_action')}
      destructive={false}
      handleConfirm={onSignOut}
    />
  );
}

function SignOutBlockedModal({trigger}: LogoutModalProps) {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);

  const onClose = useCallback(() => ref.current?.onClose(), []);

  const actions = useMemo(
    () => (
      <DialogButton
        label={t('general.close')}
        type="default"
        onPress={onClose}
      />
    ),
    [onClose, t],
  );

  return (
    <ActionsModal
      ref={ref}
      trigger={trigger}
      title={t('sign_out.blocked_title')}
      actions={actions}>
      <Text variant="body1" alignSelf="flex-start">
        {t('sign_out.blocked_body')}
      </Text>
    </ActionsModal>
  );
}
