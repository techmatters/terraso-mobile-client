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

import {forwardRef, useImperativeHandle, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  BottomSheetScrollView,
  BottomSheetModal as GorhomBottomSheetModal,
} from '@gorhom/bottom-sheet';
import {useFocusEffect} from '@react-navigation/native';

import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';
import {BigCloseButton} from 'terraso-mobile-client/components/buttons/icons/common/BigCloseButton';
import {
  ModalContext,
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';

export type InfoSheetProps = React.PropsWithChildren<{
  heading?: React.ReactNode;
  trigger?: ModalTrigger;
}>;

export const InfoSheet = forwardRef<ModalHandle, InfoSheetProps>(
  ({heading, trigger, children}: InfoSheetProps, ref) => {
    const {headerHeight} = useHeaderHeight();

    const modalRef = useRef<GorhomBottomSheetModal>(null);
    const methods = useMemo(
      () => ({
        onClose: () => modalRef.current?.dismiss(),
        onOpen: () => modalRef.current?.present(),
      }),
      [modalRef],
    );
    useImperativeHandle(ref, () => methods, [methods]);

    return (
      <>
        {trigger && trigger(methods.onOpen)}
        <GorhomBottomSheetModal
          ref={modalRef}
          handleComponent={null}
          topInset={headerHeight}
          backdropComponent={BackdropComponent}
          snapPoints={['100%']}
          enableDynamicSizing={false}>
          <ModalContext.Provider value={methods}>
            <BottomSheetScrollView focusHook={useFocusEffect}>
              <View style={styles.content}>
                <View style={styles.headingRow}>
                  <View style={styles.headingContent}>{heading}</View>
                  <BigCloseButton onPress={methods.onClose} />
                </View>
                {children}
              </View>
            </BottomSheetScrollView>
          </ModalContext.Provider>
        </GorhomBottomSheetModal>
      </>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  headingRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignContent: 'space-evenly',
    alignItems: 'center',
  },
  headingContent: {
    marginRight: 'auto',
  },
});
