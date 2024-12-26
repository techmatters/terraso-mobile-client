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

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type OutlinedButtonProps = {
  label: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  onPress?: TouchableRippleProps['onPress'];
};

export const OutlinedButton = ({
  label,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
}: OutlinedButtonProps) => {
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

  return (
    <View>
      <TouchableRipple
        style={[styles.container, containerStyle]}
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
              size="xs"
              style={[styles.leftIcon, contentStyle]}
            />
          ) : (
            <></>
          )}
          <Text style={[styles.label, contentStyle]}>{label}</Text>
          {rightIcon ? (
            <Icon
              name={rightIcon}
              size="xs"
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
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  containerDefault: {
    borderColor: convertColorProp('primary.main'),
    backgroundColor: convertColorProp('transparent'),
  },
  containerDefaultPressed: {
    borderColor: convertColorProp('primary.main'),
    backgroundColor: convertColorProp('action.selected'),
  },
  containerDisabled: {
    borderColor: convertColorProp('action.disabled'),
  },
  contentDefault: {
    color: convertColorProp('primary.main'),
  },
  contentDisabled: {
    color: convertColorProp('action.disabled'),
  },
  label: {
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 13,
    lineHeight: 22,
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
};

const CONTENT_STYLES = {
  default: styles.contentDefault,
  disabled: styles.contentDisabled,
};
