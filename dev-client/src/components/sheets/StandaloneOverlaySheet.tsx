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
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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
import {useGorhomSheetHandleRef} from 'terraso-mobile-client/components/sheets/hooks/gorhomHooks';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';

export type StandaloneOverlaySheetProps = React.PropsWithChildren<{
  trigger?: ModalTrigger;
}>;

/*
 * Simple overlay sheet with no special header or sizing. Just fits to its
 * contents, making them scrollable if needed. Intended for one-off cases
 * where design doesn't indicate more specific sheet behavior.
 */
export const StandaloneOverlaySheet = forwardRef<
  ModalHandle,
  StandaloneOverlaySheetProps
>(({trigger, children}: StandaloneOverlaySheetProps, ref) => {
  const {headerHeight} = useHeaderHeight();
  const {sheetRef, handle} = useGorhomSheetHandleRef(ref);
  const insets = useSafeAreaInsets();

  return (
    <>
      {trigger && trigger(handle.onOpen)}
      <GorhomBottomSheetModal
        ref={sheetRef}
        handleComponent={null}
        topInset={headerHeight}
        bottomInset={insets.bottom}
        enableDynamicSizing={true}
        backdropComponent={BackdropComponent}>
        <ModalContext.Provider value={handle}>
          <BottomSheetScrollView focusHook={useFocusEffect}>
            {children}
          </BottomSheetScrollView>
        </ModalContext.Provider>
      </GorhomBottomSheetModal>
    </>
  );
});
