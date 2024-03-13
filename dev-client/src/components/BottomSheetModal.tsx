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

import {forwardRef, useImperativeHandle, useMemo, useRef} from 'react';
import {
  BottomSheetScrollView,
  BottomSheetModal as GorhomBottomSheetModal,
} from '@gorhom/bottom-sheet';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {Pressable} from 'react-native';
import {
  ModalHandle,
  ModalProps,
  ModalContext,
} from 'terraso-mobile-client/components/Modal';
import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';

type Props = ModalProps & {
  fullHeight?: boolean;
};

export const BottomSheetModal = forwardRef<
  ModalHandle,
  React.PropsWithChildren<Props>
>(({children, trigger, CloseButton, fullHeight = false}, forwardedRef) => {
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
        snapPoints={fullHeight ? ['100%'] : undefined}
        enableDynamicSizing={!fullHeight}>
        <ModalContext.Provider value={methods}>
          <BottomSheetScrollView>
            {children}
            {CloseButton === undefined ? (
              <CardCloseButton size="lg" onPress={methods.onClose} />
            ) : (
              CloseButton
            )}
          </BottomSheetScrollView>
        </ModalContext.Provider>
      </GorhomBottomSheetModal>
    </>
  );
});
