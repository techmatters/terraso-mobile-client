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
import {ReactNode, useCallback, useState} from 'react';

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {
  Box,
  BoxProps,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  Head: ReactNode;
  children: ReactNode;
  initiallyOpen?: boolean;
  disableOpen?: boolean;
  boxProps?: BoxProps;
};

export const Accordion = ({
  Head,
  children,
  initiallyOpen = false,
  disableOpen = false,
  boxProps,
}: Props) => {
  const [open, setOpen] = useState(initiallyOpen);
  const onPress = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const name = open ? 'expand-less' : 'expand-more';
  return (
    <Box {...boxProps}>
      <Row
        backgroundColor="primary.dark"
        alignItems="center"
        justifyContent="space-between"
        px="16px">
        {Head}
        {!disableOpen && <IconButton type="sm" name={name} onPress={onPress} />}
      </Row>
      {open && children}
    </Box>
  );
};
