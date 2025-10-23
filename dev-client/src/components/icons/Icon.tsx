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

import React from 'react';
import {ColorValue} from 'react-native';

import MaterialIcon from '@expo/vector-icons/MaterialIcons';

import {
  convertColorProp,
  convertNBStyles,
  NativeBaseProps,
  ThemeColor,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';
import {theme} from 'terraso-mobile-client/theme';

export type IconSize = keyof typeof theme.components.Icon.sizes | number;

export type IconProps = Omit<
  React.ComponentProps<typeof MaterialIcon>,
  'size' | 'color'
> &
  NativeBaseProps & {
    size?: IconSize;
    color?: ThemeColor | ColorValue | string;
  };

export type IconName = IconProps['name'];

export const Icon = ({size = 'md', color, ...props}: IconProps) => {
  const convertedColor = convertColorProp(color);
  return (
    <MaterialIcon
      {...convertNBStyles(props)}
      size={typeof size === 'string' ? theme.components.Icon.sizes[size] : size}
      // DEFENSIVE FIX: Only pass color prop if it's defined to prevent
      // React Native SVG "is not a valid color or brush" errors.
      // See WARNINGS_TO_FIX.md Issue #7.
      {...(convertedColor !== undefined && {color: convertedColor})}
    />
  );
};
