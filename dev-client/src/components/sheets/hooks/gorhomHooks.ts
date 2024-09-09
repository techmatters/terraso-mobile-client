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

/* Allows binding a GorhomBottomSheetModal to forwarded refs of our own ModalHandle type */
export const useGorhomSheetHandleRef = (
  handleRef: ForwardedRef<ModalHandle>,
): {
  sheetRef: RefObject<GorhomBottomSheetModal>;
  handle: ModalHandle;
} => {
  const sheetRef = useRef<GorhomBottomSheetModal>(null);
  const handle = useGorhomSheetHandle(sheetRef);
  useImperativeHandle(handleRef, () => handle, [handle]);
  return {sheetRef, handle};
};

/* Allows binding a GorhomBottomSheetModal to our own ModalHandle type. */
export const useGorhomSheetHandle = (
  sheetRef: RefObject<GorhomBottomSheetModal>,
): ModalHandle => {
  return useMemo(
    () => ({
      onClose: () => sheetRef?.current?.dismiss(),
      onOpen: () => sheetRef?.current?.present(),
    }),
    [sheetRef],
  );
};
