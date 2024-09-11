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

import {forwardRef} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  BottomSheetScrollView,
  BottomSheetModal as GorhomBottomSheetModal,
} from '@gorhom/bottom-sheet';
import {useFocusEffect} from '@react-navigation/native';

import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';
import {
  ModalContext,
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {FormOverlaySheetHeader} from 'terraso-mobile-client/components/sheets/FormOverlaySheetHeader';
import {useGorhomSheetHandleRef} from 'terraso-mobile-client/components/sheets/hooks/gorhomHooks';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';

export type FormOverlaySheetProps = React.PropsWithChildren<{
  trigger?: ModalTrigger;
}>;

/*
 * Half-screen overlay sheet with a top header labeled "done", used for presenting form controls to the user.
 */
export const FormOverlaySheet = forwardRef<ModalHandle, FormOverlaySheetProps>(
  ({children, trigger}: FormOverlaySheetProps, ref) => {
    const {headerHeight} = useHeaderHeight();
    const {sheetRef, handle} = useGorhomSheetHandleRef(ref);

    return (
      <>
        {trigger && trigger(handle.onOpen)}
        <GorhomBottomSheetModal
          ref={sheetRef}
          handleComponent={null}
          topInset={headerHeight}
          backdropComponent={BackdropComponent}
          snapPoints={['50%', '100%']}
          enableDynamicSizing={false}>
          <ModalContext.Provider value={handle}>
            <FormOverlaySheetHeader onDone={handle.onClose} />
            <BottomSheetScrollView focusHook={useFocusEffect}>
              {children}
            </BottomSheetScrollView>
            <View style={styles.bottomPadding} />
          </ModalContext.Provider>
        </GorhomBottomSheetModal>
      </>
    );
  },
);

const styles = StyleSheet.create({
  bottomPadding: {
    padding: 24,
  },
});
