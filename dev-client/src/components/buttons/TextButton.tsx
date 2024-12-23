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
import {AccessibilityProps, StyleSheet, Text} from 'react-native';
import {TouchableRipple, TouchableRippleProps} from 'react-native-paper';

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

  const containerStyle = pressed
    ? styles.containerPressed
    : styles.containerDefault;
  const contentStyle = disabled ? COLOR_STYLES.disabled : COLOR_STYLES[type];

  return (
    <TouchableRipple
      style={[styles.container, containerStyle]}
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
            size="sm"
            style={[styles.leftIcon, contentStyle]}
          />
        ) : (
          <></>
        )}
        <Text style={[styles.label, contentStyle]}>{label}</Text>
        {rightIcon ? (
          <Icon
            name={rightIcon}
            size="sm"
            style={[styles.rightIcon, contentStyle]}
          />
        ) : (
          <></>
        )}
      </>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  containerDefault: {
    backgroundColor: 'transparent',
  },
  containerPressed: {
    backgroundColor: convertColorProp('action.selected'),
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 24,
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
