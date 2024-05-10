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
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {CloseButton} from 'terraso-mobile-client/components/buttons/CloseButton';
import {Pressable, StyleSheet} from 'react-native';
import {Modal as PaperModal, Portal} from 'react-native-paper';
import {Divider} from 'native-base';
import {KeyboardAvoidingView} from 'react-native';
import {
  Box,
  BoxProps,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type ModalHandle = {
  onClose: () => void;
  onOpen: () => void;
};

export const ModalContext = createContext<ModalHandle | undefined>(undefined);

export const useModal = () => useContext(ModalContext);

export type ModalTrigger = (onOpen: () => void) => React.ReactNode;

export type ModalProps = {
  Header?: React.ReactNode;
  Footer?: React.ReactNode;
  trigger?: ModalTrigger;
  Closer?: React.ReactNode | null;
  closeHook?: () => void;
};

export const Modal = forwardRef<
  ModalHandle,
  React.PropsWithChildren<ModalProps> & BoxProps
>(
  (
    {
      children,
      trigger,
      closeHook,
      Closer,
      Header,
      Footer,
      padding = 'lg',
      ..._content
    },
    forwardedRef,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const onOpen = useCallback(() => setIsOpen(true), [setIsOpen]);
    const onClose = useCallback(() => setIsOpen(false), [setIsOpen]);
    const handle = useMemo(() => ({onClose, onOpen}), [onOpen, onClose]);
    if (Closer === undefined) {
      Closer = <CloseButton onPress={onClose} />;
    }

    useEffect(() => {
      if (!isOpen && closeHook) {
        closeHook();
      }
    }, [isOpen, closeHook]);

    useImperativeHandle(forwardedRef, () => handle, [handle]);

    return (
      <>
        {trigger && (
          <Pressable onPress={handle.onOpen}>
            {trigger(handle.onOpen)}
          </Pressable>
        )}
        <Portal>
          <PaperModal visible={isOpen} onDismiss={onClose}>
            <Box
              backgroundColor="primary.contrast"
              borderRadius="24px"
              margin="10%"
              {..._content}>
              <Box padding={padding}>
                <KeyboardAvoidingView
                  style={styles.keyboardAvoidingView}
                  behavior="padding"
                  keyboardVerticalOffset={100}>
                  <Row mb="md" alignItems="flex-start">
                    {Header}
                    <Box flex={1} />
                    {Closer}
                  </Row>
                  <ModalContext.Provider value={handle}>
                    {children}
                  </ModalContext.Provider>
                </KeyboardAvoidingView>
              </Box>
              {Footer && (
                <>
                  <Divider />
                  <Box padding={padding}>{Footer}</Box>
                </>
              )}
            </Box>
          </PaperModal>
        </Portal>
      </>
    );
  },
);

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
  },
});
