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

import {
  ForwardedRef,
  RefObject,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import {BottomSheetModal as GorhomBottomSheetModal} from '@gorhom/bottom-sheet';

import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';

/**
 * Creates a Gorhom BottomSheetModal ref connected to the given ModalHandle forward ref, allowing a sheet instance to
 * be exposed via the ModalHandle and opened or closed via the handle's methods. Returns both the sheet ref (so it can
 * be passed down to the sheet component) and the modal handle (so it can be manipulated or passed elsewhere).
 */
export const useGorhomSheetHandleRef = (
  handleRef: ForwardedRef<ModalHandle>,
): {
  sheetRef: RefObject<GorhomBottomSheetModal | null>;
  handle: ModalHandle;
} => {
  const sheetRef = useRef<GorhomBottomSheetModal>(null);
  const handle = useGorhomSheetHandle(sheetRef);
  useImperativeHandle(handleRef, () => handle, [handle]);
  return {sheetRef, handle};
};

/**
 * Connects a Gorhom BottomSheetModal ref connected to a ModalHandle, allowing it to be opened or closed via the
 * handle's methods.
 */
export const useGorhomSheetHandle = (
  sheetRef: RefObject<GorhomBottomSheetModal | null>,
): ModalHandle => {
  return useMemo(
    () => ({
      onClose: () => sheetRef?.current?.dismiss(),
      onOpen: () => sheetRef?.current?.present(),
    }),
    [sheetRef],
  );
};
