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

import {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TouchableRipple, TouchableRippleProps} from 'react-native-paper';

import {
  Icon,
  IconName,
  IconSize,
} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type ContainedButtonSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'; /* (XL only appears in special cases) */

export type ContainedButtonProps = {
  label: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  size?: ContainedButtonSize;
  stretchToFit?: boolean;
  onPress?: TouchableRippleProps['onPress'];
};

export const ContainedButton = ({
  label,
  leftIcon,
  rightIcon,
  disabled,
  size = 'md',
  stretchToFit,
  onPress,
}: ContainedButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const onPressIn = useCallback(() => setPressed(true), [setPressed]);
  const onPressOut = useCallback(() => setPressed(false), [setPressed]);

  const containerStyles = disabled
    ? CONTAINER_STYLES.disabled
    : CONTAINER_STYLES.default;
  const containerStyle = pressed
    ? containerStyles.pressed
    : containerStyles.default;
  const contentStyle = disabled
    ? CONTENT_STYLES.disabled
    : CONTENT_STYLES.default;
  const containerSize = CONTAINER_STYLES[size];
  const contentSize = CONTENT_STYLES[size];
  const iconSize = ICON_SIZES[size];
  const stretchStyle = stretchToFit ? styles.containerStretch : undefined;

  return (
    <View>
      <TouchableRipple
        style={[styles.container, containerSize, containerStyle, stretchStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{disabled}}
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}>
        <>
          {leftIcon ? (
            <Icon
              name={leftIcon}
              size={iconSize}
              style={[styles.leftIcon, contentStyle]}
            />
          ) : (
            <></>
          )}
          <Text style={[styles.label, contentSize, contentStyle]}>{label}</Text>
          {rightIcon ? (
            <Icon
              name={rightIcon}
              size={iconSize}
              style={[styles.rightIcon, contentStyle]}
            />
          ) : (
            <></>
          )}
        </>
      </TouchableRipple>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerStretch: {
    alignSelf: 'auto',
  },
  containerSm: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  containerMd: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  containerLg: {
    paddingVertical: 8,
    paddingHorizontal: 22,
  },
  containerXl: {
    paddingVertical: 16,
    paddingHorizontal: 44,
  },
  containerDefault: {
    backgroundColor: convertColorProp('primary.main'),
    borderColor: convertColorProp('primary.main'),
  },
  containerDefaultPressed: {
    backgroundColor: convertColorProp('primary.dark'),
    borderColor: convertColorProp('primary.dark'),
  },
  containerDisabled: {
    backgroundColor: convertColorProp('action.disabledBackground'),
    borderColor: convertColorProp('action.disabledBackground'),
  },
  contentDefault: {
    color: convertColorProp('primary.contrast'),
  },
  contentDisabled: {
    color: convertColorProp('action.disabled'),
  },
  label: {
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  labelSm: {
    fontSize: 13,
    lineHeight: 22,
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 24,
  },
  labelLg: {
    fontSize: 15,
    lineHeight: 26,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

const CONTAINER_STYLES = {
  default: {
    default: styles.containerDefault,
    pressed: styles.containerDefaultPressed,
  },
  disabled: {
    default: styles.containerDisabled,
    pressed: styles.containerDisabled,
  },
  sm: styles.containerSm,
  md: styles.containerMd,
  lg: styles.containerLg,
  xl: styles.containerXl,
};

const CONTENT_STYLES = {
  default: styles.contentDefault,
  disabled: styles.contentDisabled,
  sm: styles.labelSm,
  md: styles.labelMd,
  lg: styles.labelLg,
  xl: styles.labelLg,
};

const ICON_SIZES: Record<string, IconSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'md',
};
