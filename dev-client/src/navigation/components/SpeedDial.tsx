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

import {useState, useCallback} from 'react';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SpeedDial = ({children}: React.PropsWithChildren<{}>) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleIsOpen = useCallback(() => setIsOpen(value => !value), []);

  return (
    <Column
      alignItems="flex-end"
      position="absolute"
      right="16px"
      bottom="16px"
      space="16px">
      {isOpen && children}
      <IconButton
        variant="FAB"
        size="lg"
        name={isOpen ? 'close' : 'add'}
        onPress={toggleIsOpen}
      />
    </Column>
  );
};
