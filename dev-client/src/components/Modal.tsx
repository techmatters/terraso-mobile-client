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
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {Pressable, StyleSheet} from 'react-native';
import {useDisclose, Modal as NativeBaseModal} from 'native-base';
import {KeyboardAvoidingView} from 'react-native';

export type ModalHandle = {
  onClose: () => void;
  onOpen: () => void;
};

export const ModalContext = createContext<ModalHandle | undefined>(undefined);

export const useModal = () => useContext(ModalContext);

export type ModalTrigger = (onOpen: () => void) => React.ReactNode;

export type Props = React.PropsWithChildren<{
  trigger?: ModalTrigger;
  CloseButton?: React.ReactNode | null;
  closeHook?: () => void;
  _content?: React.ComponentProps<typeof NativeBaseModal.Content>;
}>;

export const Modal = forwardRef<ModalHandle, Props>(
  ({children, trigger, closeHook, CloseButton, _content}, forwardedRef) => {
    const {isOpen, onOpen, onClose} = useDisclose();
    const handle = useMemo(() => ({onClose, onOpen}), [onOpen, onClose]);
    if (CloseButton === undefined) {
      CloseButton = <CardCloseButton onPress={onClose} />;
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
        <NativeBaseModal isOpen={isOpen} onClose={onClose}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior="padding"
            keyboardVerticalOffset={100}>
            <NativeBaseModal.Content
              borderRadius="24px"
              padding="18px"
              {..._content}>
              <ModalContext.Provider value={handle}>
                {children}
              </ModalContext.Provider>
              {CloseButton}
            </NativeBaseModal.Content>
          </KeyboardAvoidingView>
        </NativeBaseModal>
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
