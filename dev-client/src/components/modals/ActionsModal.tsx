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
  Modal,
  ModalHandle,
  ModalProps,
} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type ActionsModalProps = Pick<ModalProps, 'trigger'> & {
  title?: string;
  actions: React.ReactNode;
};

/**
 * Modal presented to a user when asked to choose from a fixed set of actions
 */
export const ActionsModal = forwardRef<
  ModalHandle,
  React.PropsWithChildren<ActionsModalProps>
>(({title, actions, children, ...modalProps}, forwardedRef) => {
  const ref = useRef<ModalHandle>(null);
  useImperativeHandle(forwardedRef, () => ref.current!);

  const hasTitle = title !== undefined;

  const Footer = useMemo(
    () => (
      <Row space="8px" alignSelf="flex-end">
        {actions}
      </Row>
    ),
    [actions],
  );

  return (
    <Modal
      ref={ref}
      Closer={null}
      backgroundColor="grey.200"
      Footer={Footer}
      {...modalProps}>
      {hasTitle && (
        <Heading variant="h5" textAlign="center">
          {title}
        </Heading>
      )}

      {/* (Box spacer between header & body is only present for modals w/ titles) */}
      {hasTitle && <Box height="md" />}

      {children}
    </Modal>
  );
});
