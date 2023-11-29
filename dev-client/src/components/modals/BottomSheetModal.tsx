import {forwardRef, useImperativeHandle, useMemo, useRef} from 'react';
import {
  BottomSheetScrollView,
  BottomSheetModal as GorhomBottomSheetModal,
} from '@gorhom/bottom-sheet';
import {useHeaderHeight} from 'terraso-mobile-client/context/HeaderHeightContext';
import {CardCloseButton} from 'terraso-mobile-client/components/common/Card';
import {Pressable} from 'react-native';
import {ModalMethods, Props, BackdropComponent, ModalContext} from './Modal';

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
