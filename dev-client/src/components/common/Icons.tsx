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

import {
  Icon as NativeIcon,
  IconButton as NativeIconButton,
  Text,
  Box,
  HStack,
} from 'native-base';
import React from 'react';
import {Pressable} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
export {default as MaterialCommunityIcons} from 'react-native-vector-icons/MaterialCommunityIcons';

export type IconProps = React.ComponentProps<typeof NativeIcon>;
export const Icon = ({as, ...props}: IconProps) => (
  <NativeIcon as={as ?? MaterialIcons} {...props} />
);

export type IconButtonProps = React.ComponentProps<typeof NativeIconButton> & {
  as?: any;
  name: string;
  label?: string;
  textColor?: string;
};
export const IconButton = React.forwardRef(
  (
    {as, name, label, textColor, ...props}: IconButtonProps,
    ref: React.Ref<unknown>,
  ) => {
    const icon = (
      <NativeIconButton
        ref={ref}
        icon={<Icon as={as} name={name} />}
        {...props}
      />
    );
    if (label === undefined) {
      return icon;
    }
    return (
      <Pressable onPress={props.onPress}>
        <Box p="1">
          <HStack>
            {icon}
            <Text color={textColor || 'primary.contrast'} fontSize="sm" pl={1}>
              {label}
            </Text>
          </HStack>
        </Box>
      </Pressable>
    );
  },
);
