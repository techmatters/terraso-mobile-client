/*
 * Copyright © 2023 Technology Matters
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

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {useTranslation} from 'react-i18next';

import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {
  ActionsModal,
  ActionsModalProps,
} from 'terraso-mobile-client/components/modals/ActionsModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = Omit<ActionsModalProps, 'actions'> & {
  title?: string;
  body: string;
  actionLabel: string;
  destructive?: boolean;
  handleConfirm: () => void;
};

/**
 * Modal presented to a user when asked to confirm or cancel an action
 */
export const ConfirmModal = forwardRef<ModalHandle, Props>(
  (
    {
      title,
      body,
      actionLabel,
      handleConfirm,
      destructive = true,
      ...modalProps
    }: Props,
    forwardedRef,
  ) => {
    const {t} = useTranslation();
    const ref = useRef<ModalHandle>(null);
    useImperativeHandle(forwardedRef, () => ref.current!);

    const onClose = useCallback(() => ref.current?.onClose(), [ref]);
    const onConfirm = useCallback(() => {
      handleConfirm();
      onClose();
    }, [handleConfirm, onClose]);

    const actions = useMemo(
      () => (
        <>
          <DialogButton
            label={t('general.cancel')}
            type="outlined"
            onPress={onClose}
          />
          <DialogButton
            label={actionLabel}
            onPress={onConfirm}
            type={destructive ? 'destructive' : 'default'}
          />
        </>
      ),
      [onConfirm, onClose, actionLabel, t, destructive],
    );

    return (
      <ActionsModal title={title} ref={ref} actions={actions} {...modalProps}>
        <Text variant="body1" alignSelf="flex-start">
          {body}
        </Text>
      </ActionsModal>
    );
  },
);
