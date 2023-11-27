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
  Center,
} from 'native-base';
import React from 'react';
import {View, Pressable} from 'react-native';
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
};
export const IconButton = React.forwardRef(
  ({as, name, label, ...props}: IconButtonProps, ref: React.Ref<unknown>) => {
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
          {icon}
          <Center>
            <Text color="primary.contrast" fontSize="xs">
              {label}
            </Text>
          </Center>
        </Box>
      </Pressable>
    );
  },
);

export type HorizontalIconButtonProps = React.ComponentProps<
  typeof NativeIconButton
> & {
  as?: any;
  name: string;
  label?: string;
  colorScheme?: string;
  isUppercase?: boolean;
};
export const HorizontalIconButton = React.forwardRef(
  (
    {
      as,
      name,
      label,
      colorScheme,
      isUppercase,
      ...props
    }: HorizontalIconButtonProps,
    ref: React.Ref<unknown>,
  ) => {
    const icon = (
      <NativeIconButton
        p={0}
        ref={ref}
        icon={<Icon as={as} name={name} />}
        {...props}
      />
    );

    return (
      <Pressable onPress={props.onPress}>
        <Box>
          <HStack>
            {icon}
            <Text
              color={colorScheme || 'primary.contrast'}
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
export const LocationIcon = () => {
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Icon name="my-location" color="black" size="14" />
    </View>
  );
};

export const LinkNewWindowIcon = () => {
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{flexDirection: 'row'}}>
      <Icon name="open-in-new" color="primary.main" size="14" />
    </View>
  );
};
