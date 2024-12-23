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

import {useMemo, useState} from 'react';
import {AccessibilityProps, Pressable, StyleSheet, Text} from 'react-native';
import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

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
  onPress?: PressableProps['onPress'];
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
  const onPressIn = useMemo(() => () => setPressed(true), [setPressed]);
  const onPressOut = useMemo(() => () => setPressed(false), [setPressed]);

  const colorStyles = disabled ? COLOR_STYLES.disabled : COLOR_STYLES[type];
  const colorStyle = pressed ? colorStyles.pressed : colorStyles.default;

  return (
    <Pressable
      style={styles.container}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      {leftIcon ? (
        <Icon name={leftIcon} style={[styles.leftIcon, colorStyle]} />
      ) : (
        <></>
      )}
      <Text style={[styles.label, colorStyle]}>{label}</Text>
      {rightIcon ? (
        <Icon name={rightIcon} style={[styles.rightIcon, colorStyle]} />
      ) : (
        <></>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 26,
    marginHorizontal: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  contentDefault: {
    color: convertColorProp('primary.main'),
  },
  contentDefaultPressed: {
    color: convertColorProp('primary.dark'),
  },
  contentDestructive: {
    color: convertColorProp('error.main'),
  },
  contentDestructivePressed: {
    color: convertColorProp('error.content'),
  },
  contentAlertError: {
    color: convertColorProp('error.content'),
  },
  contentAlertErrorPressed: {
    color: convertColorProp('error.content'),
  },
  contentDisabled: {
    color: convertColorProp('text.disabled'),
  },
});

const COLOR_STYLES = {
  default: {
    default: styles.contentDefault,
    pressed: styles.contentDefaultPressed,
  },
  destructive: {
    default: styles.contentDestructive,
    pressed: styles.contentDestructivePressed,
  },
  alertError: {
    default: styles.contentAlertError,
    pressed: styles.contentAlertError,
  },
  disabled: {
    default: styles.contentDisabled,
    pressed: styles.contentDisabled,
  },
};
