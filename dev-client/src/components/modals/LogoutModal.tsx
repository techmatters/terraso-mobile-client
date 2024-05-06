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

import {ModalProps} from 'terraso-mobile-client/components/modals/Modal';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {useDispatch} from 'terraso-mobile-client/store';
import {useCallback} from 'react';
import {signOut} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';

export type LogoutModalProps = Pick<ModalProps, 'trigger'>;

export function LogoutModal({trigger}: LogoutModalProps) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const onLogout = useCallback(() => {
    dispatch(signOut());
  }, [dispatch]);

  return (
    <ConfirmModal
      trigger={trigger}
      body={t('logout.confirm_body')}
      actionName={t('logout.confirm_action')}
      isConfirmError={false}
      handleConfirm={onLogout}
    />
  );
}
