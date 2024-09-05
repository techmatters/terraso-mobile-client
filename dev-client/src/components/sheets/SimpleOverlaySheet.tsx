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
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';

export type SimpleOverlaySheetProps = React.PropsWithChildren<{
  trigger?: ModalTrigger;
}>;

export const SimpleOverlaySheet = forwardRef<
  ModalHandle,
  SimpleOverlaySheetProps
>(({trigger, children}: SimpleOverlaySheetProps, forwardedRef) => {
  const {headerHeight} = useHeaderHeight();

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
      {trigger && trigger(methods.onOpen)}
      <GorhomBottomSheetModal
        ref={ref}
        handleComponent={null}
        topInset={headerHeight}
        enableDynamicSizing={true}
        backdropComponent={BackdropComponent}>
        <ModalContext.Provider value={methods}>
          <BottomSheetScrollView focusHook={useFocusEffect}>
            {children}
          </BottomSheetScrollView>
        </ModalContext.Provider>
      </GorhomBottomSheetModal>
    </>
  );
});
