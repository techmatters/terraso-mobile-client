import {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetModal as GorhomBottomSheetModal,
} from '@gorhom/bottom-sheet';
import {useHeaderHeight} from 'terraso-mobile-client/screens/ScreenScaffold';
import {CardCloseButton} from 'terraso-mobile-client/components/common/Card';
import {Pressable, StyleSheet} from 'react-native';
import {useDisclose, Modal as NativeBaseModal} from 'native-base';
import {KeyboardAvoidingView} from 'react-native';

type ModalMethods = {
  onClose: () => void;
  onOpen: () => void;
};

const ModalContext = createContext<ModalMethods | undefined>(undefined);
export const useModal = () => useContext(ModalContext);

type Props = React.PropsWithChildren<{
  trigger?: (onOpen: () => void) => React.ReactNode;
}>;

export const Modal = forwardRef<ModalMethods, Props>(
  ({children, trigger}, forwardedRef) => {
    const {isOpen, onOpen, onClose} = useDisclose();
    const methods = useMemo(() => ({onClose, onOpen}), [onOpen, onClose]);
    useImperativeHandle(forwardedRef, () => methods, [methods]);
    return (
      <>
        {trigger && (
          <Pressable onPress={methods.onOpen}>
            {trigger(methods.onOpen)}
          </Pressable>
        )}
        <NativeBaseModal isOpen={isOpen} onClose={onClose}>
          <KeyboardAvoidingView
            style={styles.nativeBaseModalChild}
            behavior="padding"
            keyboardVerticalOffset={100}>
            <NativeBaseModal.Content padding="18px">
              <CardCloseButton onPress={onClose} />
              <ModalContext.Provider value={methods}>
                {children}
              </ModalContext.Provider>
            </NativeBaseModal.Content>
          </KeyboardAvoidingView>
        </NativeBaseModal>
      </>
    );
  },
);

export const BottomSheetModal = forwardRef<ModalMethods, Props>(
  ({children, trigger}, forwardedRef) => {
    const headerHeight = useHeaderHeight();
    const ref = useRef<GorhomBottomSheetModal>(null);
    const methods = useMemo(
      () => ({
        onClose: () => ref.current?.dismiss(),
        onOpen: () => ref.current?.present(),
      }),
      [ref],
    );
    useImperativeHandle(forwardedRef, () => methods, [methods]);

    return (
      <>
        {trigger && (
          <Pressable onPress={methods.onOpen}>
            {trigger(methods.onOpen)}
          </Pressable>
        )}
        <GorhomBottomSheetModal
          ref={ref}
          handleComponent={null}
          topInset={headerHeight}
          backdropComponent={BackdropComponent}
          enableDynamicSizing>
          <ModalContext.Provider value={methods}>
            <BottomSheetScrollView>
              {children}
              <CardCloseButton onPress={methods.onClose} />
            </BottomSheetScrollView>
          </ModalContext.Provider>
        </GorhomBottomSheetModal>
      </>
    );
  },
);

const BackdropComponent = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
);

const styles = StyleSheet.create({
  nativeBaseModalChild: {
    width: '100%',
    alignItems: 'center',
  },
});
