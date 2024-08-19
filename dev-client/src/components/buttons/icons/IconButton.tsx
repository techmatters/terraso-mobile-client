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

import React, {forwardRef} from 'react';
import {Pressable, PressableProps, StyleSheet, View} from 'react-native';

import MaterialIcon from '@expo/vector-icons/MaterialIcons';

import {IconButton as NativeIconButton} from 'native-base';

import {IconName} from 'terraso-mobile-client/components/icons/Icon';
import {
  convertColorProp,
  convertIconSize,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type IconButtonType = 'sm' | 'md' | 'sq';

export type IconButtonVariant =
  | 'normal'
  | 'normal-filled'
  | 'light'
  | 'light-filled'
  | 'location';

export type IconButtonProps = React.ComponentProps<typeof NativeIconButton> & {
  type: IconButtonType;
  name: IconName;
  variant?: IconButtonVariant;
  accessibilityLabel?: string;
  onPress?: PressableProps['onPress'];
};

export const IconButton = forwardRef<View, IconButtonProps>(
  (
    {
      type,
      name,
      variant = 'normal',
      accessibilityLabel,
      onPress,
    }: IconButtonProps,
    ref,
  ) => {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[containerStyleForType(type), containerStyleForVariant(variant)]}
        onPress={onPress}>
        <MaterialIcon
          name={name}
          size={convertIconSize(type === 'sq' ? 'md' : type)}
          style={[
            styles.icon,
            iconStyleForType(type),
            iconStyleForVariant(variant),
          ]}
        />
      </Pressable>
    );
  },
);

const containerStyleForType = (type: IconButtonType) => {
  switch (type) {
    case 'sm':
      return styles.containerSm;
    case 'md':
      return styles.containerMd;
    case 'sq':
      return styles.containerSq;
  }
};

const iconStyleForType = (type: IconButtonType) => {
  switch (type) {
    case 'sm':
      return styles.iconSm;
    case 'md':
      return styles.iconMd;
    case 'sq':
      return styles.iconSq;
  }
};

const containerStyleForVariant = (variant: IconButtonVariant) => {
  switch (variant) {
    case 'normal-filled':
      return styles.containerNormalFilled;
    case 'light':
      return styles.containerLight;
    case 'light-filled':
      return styles.containerLightFilled;
    case 'location':
      return styles.containerLocation;
    default:
      return styles.containerNormal;
  }
};

const iconStyleForVariant = (variant: IconButtonVariant) => {
  switch (variant) {
    case 'normal-filled':
      return styles.iconNormalFilled;
    case 'light':
      return styles.iconLight;
    case 'light-filled':
      return styles.iconLightFilled;
    case 'location':
      return styles.iconLocation;
    default:
      return styles.iconNormal;
  }
};

const styles = StyleSheet.create({
  icon: {
    verticalAlign: 'middle',
    textAlign: 'center',
  },
  containerSm: {
    borderRadius: 100,
  },
  iconSm: {
    padding: 4,
  },
  containerMd: {
    borderRadius: 100,
  },
  iconMd: {
    padding: 12,
  },
  containerSq: {
    borderRadius: 5,
  },
  iconSq: {
    padding: 8,
  },
  containerNormal: {
    backgroundColor: convertColorProp('transparent'),
  },
  iconNormal: {
    color: convertColorProp('text.icon'),
  },
  containerNormalFilled: {
    backgroundColor: convertColorProp('grey.200'),
  },
  iconNormalFilled: {
    color: convertColorProp('text.icon'),
  },
  containerLight: {
    backgroundColor: convertColorProp('transparent'),
  },
  iconLight: {
    color: convertColorProp('primary.contrast'),
  },
  containerLightFilled: {
    backgroundColor: convertColorProp('primary.contrast'),
  },
  iconLightFilled: {
    color: convertColorProp('text.icon'),
  },
  containerLocation: {
    backgroundColor: convertColorProp('transparent'),
    borderColor: convertColorProp('secondary.dark'),
    borderWidth: 1,
  },
  iconLocation: {
    color: convertColorProp('secondary.dark'),
  },
});
