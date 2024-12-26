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

import {buttonShape} from 'terraso-mobile-client/components/buttons/ButtonShapes';
import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type ContainedButtonSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'; /* (XL only appears in special cases like the slope meter) */

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

  const shape = buttonShape(size);
  const containerStyles = disabled
    ? CONTAINER_STYLES.disabled
    : CONTAINER_STYLES.default;
  const containerStyle = pressed
    ? containerStyles.pressed
    : containerStyles.default;
  const contentStyle = disabled
    ? CONTENT_STYLES.disabled
    : CONTENT_STYLES.default;
  const stretchStyle = stretchToFit ? styles.containerStretch : undefined;

  return (
    <View>
      <TouchableRipple
        style={[...shape.containerStyles, containerStyle, stretchStyle]}
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
  containerStretch: {
    alignSelf: 'auto',
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
