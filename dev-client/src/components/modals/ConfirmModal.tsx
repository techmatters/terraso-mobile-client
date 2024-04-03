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

import {Button} from 'native-base';
import {
  Modal,
  ModalHandle,
} from 'terraso-mobile-client/components/modals/Modal';
import {useTranslation} from 'react-i18next';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Box,
  HStack,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = React.ComponentProps<typeof Modal> & {
  title: string;
  body: string;
  actionName: string;
  handleConfirm: () => void;
  isConfirmError?: boolean;
};

/**
 * Modal presented to a user when asked to confirm a decision
 */
export const ConfirmModal = forwardRef<ModalHandle, Props>(
  (
    {
      title,
      body,
      actionName,
      handleConfirm,
      isConfirmError = true,
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

    const Footer = useMemo(
      () => (
        <HStack space="8px" alignSelf="flex-end">
          <Button
            onPress={onClose}
            variant="confirmModal"
            _text={{
              color: 'text.primary',
              fontWeight: '400',
              fontSize: '14px',
            }}
            borderWidth="1px"
            borderColor="m3.sys.light.outline">
            {t('general.cancel')}
          </Button>
          <Button
            onPress={onConfirm}
            variant="confirmModal"
            backgroundColor={isConfirmError ? 'error.main' : 'primary.main'}
            _text={{
              color: isConfirmError ? 'error.contrast' : 'primary.contrast',
              fontWeight: '400',
              fontSize: '14px',
            }}>
            {actionName}
          </Button>
        </HStack>
      ),
      [onConfirm, onClose, actionName, t, isConfirmError],
    );

    return (
      <Modal
        ref={ref}
        CloseButton={null}
        backgroundColor="grey.200"
        Footer={Footer}
        {...modalProps}>
        <Heading variant="h5" textAlign="center">
          {title}
        </Heading>
        <Box height="md" />
        <Text variant="body1" alignSelf="flex-start">
          {body}
        </Text>
      </Modal>
    );
  },
);
