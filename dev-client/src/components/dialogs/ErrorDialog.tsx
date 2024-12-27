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

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {Modal, Portal} from 'react-native-paper';

import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {Text, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type ErrorDialogProps = React.PropsWithChildren<{
  headline?: React.ReactNode;
  supportUrl?: string;
}>;

/**
 * Dialog presented to a user when a technical error occurs.
 */
export const ErrorDialog = forwardRef<
  ModalHandle,
  React.PropsWithChildren<ErrorDialogProps>
>(({headline, supportUrl, children}, forwardedRef) => {
  const {t} = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = useCallback(() => setIsOpen(true), [setIsOpen]);
  const onClose = useCallback(() => setIsOpen(false), [setIsOpen]);
  const modalHandle = useMemo(() => ({onClose, onOpen}), [onOpen, onClose]);
  useImperativeHandle(forwardedRef, () => modalHandle, [modalHandle]);

  return (
    <Portal>
      <Modal visible={isOpen} onDismiss={onClose}>
        <View style={styles.container}>
          <View style={styles.icon}>
            <Icon name="error" color="error.main" size="md" />
          </View>
          {headline && (
            <View style={styles.headline}>
              <Text color="error.content">{headline}</Text>
            </View>
          )}
          <View>
            <Text color="error.content">{children}</Text>
          </View>
          <View style={styles.actions}>
            <ExternalLink
              type="alertError"
              label={t('general.support.label')}
              url={supportUrl ?? t('general.support.label')}
            />
            <DialogButton
              type="alertError"
              label={t('general.dismiss')}
              onPress={onClose}
            />
          </View>
        </View>
      </Modal>
    </Portal>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: convertColorProp('error.background'),
    borderRadius: 28,
    padding: 24,
    width: 312,
    alignSelf: 'center',
  },
  icon: {
    alignItems: 'center',
  },
  headline: {
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dismissText: {},
});
