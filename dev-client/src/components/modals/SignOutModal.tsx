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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {signOut} from 'terraso-client-shared/account/accountSlice';

import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {ModalProps} from 'terraso-mobile-client/components/modals/Modal';
import {useDispatch} from 'terraso-mobile-client/store';

export type LogoutModalProps = Pick<ModalProps, 'trigger'>;

export function SignOutModal({trigger}: LogoutModalProps) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const onSignOut = useCallback(() => {
    dispatch(signOut());
  }, [dispatch]);

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
