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

import React from 'react';
import MaterialIcon from '@expo/vector-icons/MaterialIcons';
import {theme} from 'terraso-mobile-client/theme';
import {
  NativeBaseProps,
  ThemeColor,
  convertNBStyles,
  convertColorProp,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type IconProps = Omit<
  React.ComponentProps<typeof MaterialIcon>,
  'size' | 'color'
> &
  NativeBaseProps & {
    size?: keyof typeof theme.components.Icon.sizes | number;
    color?: ThemeColor | string;
  };

export type IconName = IconProps['name'];

export const Icon = ({size = 'md', color, ...props}: IconProps) => {
  return (
    <MaterialIcon
      {...convertNBStyles(props)}
      size={typeof size === 'string' ? theme.components.Icon.sizes[size] : size}
      color={convertColorProp(color)}
    />
  );
};
