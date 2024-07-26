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

import {Children} from 'react';
import {Divider} from 'react-native-paper';

import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type ButtonListProps = React.PropsWithChildren;

export function MenuList({children}: ButtonListProps) {
  return (
    <Column mt="12px" mb="24px" space="6px">
      <Divider />
      {Children.map(children, child => {
        return (
          <>
            {child}
            <Divider />
          </>
        );
      })}
    </Column>
  );
}
