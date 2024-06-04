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
import {Pressable} from 'react-native';

import {IconButton as NativeIconButton} from 'native-base';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  HStack,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type HorizontalIconButtonProps = React.ComponentProps<
  typeof NativeIconButton
> & {
  name: IconName;
  label?: string;
  colorScheme?: string;
  isUppercase?: boolean;
};

export const HorizontalIconButton = React.forwardRef(
  (
    {
      name,
      label,
      colorScheme = 'primary.contrast',
      isUppercase = false,
      ...props
    }: HorizontalIconButtonProps,
    ref: React.Ref<unknown>,
  ) => {
    const icon = (
      <NativeIconButton
        p={0}
        ref={ref}
        icon={<Icon name={name} />}
        {...props}
      />
    );

    return (
      <Pressable onPress={props.onPress}>
        <Box>
          <HStack>
            {icon}
            <Text
              color={colorScheme}
              fontSize="md"
              pl={1}
              textTransform={isUppercase ? 'uppercase' : 'none'}>
              {label}
            </Text>
          </HStack>
        </Box>
      </Pressable>
    );
  },
);
