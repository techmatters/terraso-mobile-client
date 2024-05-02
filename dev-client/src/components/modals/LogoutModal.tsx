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
