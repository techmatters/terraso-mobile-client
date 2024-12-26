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
import {AccessibilityProps, StyleSheet, Text, View} from 'react-native';
import {TouchableRipple, TouchableRippleProps} from 'react-native-paper';

import {buttonShape} from 'terraso-mobile-client/components/buttons/ButtonShapes';
import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type TextButtonType = 'default' | 'destructive' | 'alertError';

export type TextButtonProps = {
  label: string;
  type?: TextButtonType;
  role?: AccessibilityProps['accessibilityRole'];
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  onPress?: TouchableRippleProps['onPress'];
};

export const TextButton = ({
  label,
  type = 'default',
  role = 'button',
  leftIcon,
  rightIcon,
  disabled,
  onPress,
}: TextButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const onPressIn = useCallback(() => setPressed(true), [setPressed]);
  const onPressOut = useCallback(() => setPressed(false), [setPressed]);

  const shape = buttonShape('text');
  const containerStyle = pressed
    ? styles.containerPressed
    : styles.containerDefault;
  const contentStyle = disabled ? COLOR_STYLES.disabled : COLOR_STYLES[type];

  return (
    <View>
      <TouchableRipple
        style={[...shape.containerStyles, containerStyle]}
        borderless={true} /* Fixes iOS ripple effect border radius issue */
        accessibilityRole={role}
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
              size={shape.iconSize}
              style={[...shape.leftIconStyles, contentStyle]}
            />
          ) : (
            <></>
          )}
          <Text style={[...shape.labelStyles, contentStyle]}>{label}</Text>
          {rightIcon ? (
            <Icon
              name={rightIcon}
              size={shape.iconSize}
              style={[...shape.rightIconStyles, contentStyle]}
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
  containerDefault: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  containerPressed: {
    backgroundColor: convertColorProp('action.selected'),
    borderColor: convertColorProp('action.selected'),
  },
  contentDefault: {
    color: convertColorProp('primary.main'),
  },
  contentDestructive: {
    color: convertColorProp('error.main'),
  },
  contentAlertError: {
    color: convertColorProp('error.content'),
  },
  contentDisabled: {
    color: convertColorProp('text.disabled'),
  },
});

const COLOR_STYLES = {
  default: styles.contentDefault,
  destructive: styles.contentDestructive,
  alertError: styles.contentAlertError,
  disabled: styles.contentDisabled,
};
