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
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';
import {Pressable} from 'react-native';
import {
  ModalHandle,
  ModalProps,
  ModalContext,
} from 'terraso-mobile-client/components/modals/Modal';
import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {BigCloseButton} from 'terraso-mobile-client/components/buttons/BigCloseButton';

type Props = ModalProps & {
  fullHeight?: boolean;
  maxHeight?: number;
  scrollable?: boolean;
};

export const OverlaySheet = forwardRef<
  ModalHandle,
  React.PropsWithChildren<Props>
>(
  (
    {
      Header,
      children,
      trigger,
      Closer,
      fullHeight = false,
      scrollable = true,
      maxHeight,
    },
    forwardedRef,
  ) => {
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

    const contents =
      Header || Closer ? (
        <Column padding="md">
          <Row alignItems="center" mb="md">
            {Header}
            <Box flex={1} />
            {Closer === undefined ? (
              <BigCloseButton onPress={methods.onClose} />
            ) : (
              Closer
            )}
          </Row>
          {children}
        </Column>
      ) : (
        children
      );

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
          enableDynamicSizing={!fullHeight}
          maxDynamicContentSize={fullHeight ? undefined : maxHeight}>
          <ModalContext.Provider value={methods}>
            {scrollable ? (
              <BottomSheetScrollView>{contents}</BottomSheetScrollView>
            ) : (
              contents
            )}
          </ModalContext.Provider>
        </GorhomBottomSheetModal>
      </>
    );
  },
);
