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

import {IconButton as NativeIconButton, Center} from 'native-base';
import React, {forwardRef} from 'react';
import {View, Pressable} from 'react-native';
import MaterialIcon from '@expo/vector-icons/MaterialIcons';
import {theme} from 'terraso-mobile-client/theme';
import {
  NativeBaseProps,
  ThemeColor,
  convertNBStyles,
  convertColorProp,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';
import {
  Box,
  HStack,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

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

export type IconButtonProps = React.ComponentProps<typeof NativeIconButton> & {
  name: IconName;
  label?: string;
};

export const IconButton = React.forwardRef(
  ({name, label, ...props}: IconButtonProps, ref: React.Ref<unknown>) => {
    const icon = (
      <NativeIconButton ref={ref} icon={<Icon name={name} />} {...props} />
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
  name: IconName;
  label?: string;
  colorScheme?: string;
  isUppercase?: boolean;
  iconFirst?: boolean;
};

export const HorizontalIconButton = React.forwardRef(
  (
    {
      name,
      label,
      colorScheme = 'primary.contrast',
      isUppercase = false,
      iconFirst = true,
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
            {iconFirst ? icon : null}
            <Text
              color={colorScheme}
              fontSize="md"
              pl={1}
              textTransform={isUppercase ? 'uppercase' : 'none'}>
              {label}
            </Text>
            {iconFirst ? null : icon}
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
      <Icon name="my-location" color="black" size={14} />
    </View>
  );
};

export const LinkNewWindowIcon = () => {
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{flexDirection: 'row'}}>
      <Icon name="open-in-new" color="primary.main" size={14} />
    </View>
  );
};

type TooltipIconButtonProps = {
  icon?: IconName;
  onPress: () => void;
};
const tooltipIconProps = {color: 'action.active_subtle', size: 'md'};
export const TooltipIconButton = forwardRef(
  ({icon: name = 'info', onPress}: TooltipIconButtonProps, ref) => (
    <IconButton
      ref={ref}
      _icon={tooltipIconProps}
      ml="6px"
      p="0"
      name={name}
      onPress={onPress}
    />
  ),
);
