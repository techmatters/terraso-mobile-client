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
import {
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {IconSize} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

/**
 * Base shapes and structure for button implementations. Individual button implementations
 * should use these constants and components for consistent behavior and styling.
 */
export type ButtonShape = 'sm' | 'md' | 'lg' | 'xl' | 'dialog' | 'text';

export type StateStyles<T> = {
  default: StyleProp<T>;
  pressed?: StyleProp<T>;
  disabled?: StyleProp<T>;
};

export type BaseButtonProps = {
  shape: ButtonShape;
  stretchToFit?: boolean;
  containerStyles: StateStyles<ViewStyle>;
  contentStyles: StateStyles<TextStyle>;
  label: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export const BaseButton = ({
  shape,
  stretchToFit,
  containerStyles: container,
  contentStyles: content,
  label,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
}: BaseButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const onPressIn = useCallback(() => setPressed(true), [setPressed]);
  const onPressOut = useCallback(() => setPressed(false), [setPressed]);

  const containerStyles = containerShapeStyles[shape];
  const labelStyles = labelShapeStyles[shape];
  const leftIconStyles = leftIconShapeStyles[shape];
  const rightIconStyles = rightIconShapeStyles[shape];
  const iconSize = iconShapeSize[shape];

  const stretchStyle = stretchToFit ? styles.containerStretch : undefined;

  const stateContainerStyle = styleForState(container, {disabled, pressed});
  const stateContentStyle = styleForState(content, {disabled, pressed});

  return (
    <TouchableWithoutFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress ? () => onPress(undefined as any) : undefined}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <View style={[...containerStyles, stretchStyle, stateContainerStyle]}>
        {leftIcon ? (
          <Icon
            name={leftIcon}
            size={iconSize}
            style={[leftIconStyles, stateContentStyle]}
          />
        ) : (
          <></>
        )}
        <Text style={[labelStyles, stateContentStyle]}>{label}</Text>
        {rightIcon ? (
          <Icon
            name={rightIcon}
            size={iconSize}
            style={[rightIconStyles, stateContentStyle]}
          />
        ) : (
          <></>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export const styleForState = <T,>(
  style: StateStyles<T>,
  state: {disabled?: boolean; pressed?: boolean},
) => {
  const defaultStyle = style.default;
  const disabledStyle = style.disabled ?? style.default;
  const pressedStyle = style.pressed ?? style.default;

  return state.disabled
    ? disabledStyle
    : state.pressed
      ? pressedStyle
      : defaultStyle;
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
  containerDialog: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  containerText: {
    paddingVertical: 6,
    paddingHorizontal: 8,
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
  labelXl: {
    fontSize: 15,
    lineHeight: 26,
  },
  labelDialog: {
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  labelText: {
    fontSize: 14,
    lineHeight: 24,
    marginHorizontal: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

const containerShapeStyles = {
  sm: [styles.container, styles.containerSm],
  md: [styles.container, styles.containerMd],
  lg: [styles.container, styles.containerLg],
  xl: [styles.container, styles.containerXl],
  dialog: [styles.container, styles.containerDialog],
  text: [styles.container, styles.containerText],
};

const labelShapeStyles = {
  sm: [styles.label, styles.labelSm],
  md: [styles.label, styles.labelMd],
  lg: [styles.label, styles.labelLg],
  xl: [styles.label, styles.labelXl],
  dialog: [styles.label, styles.labelDialog],
  text: [styles.label, styles.labelText],
};

const leftIconShapeStyles = {
  sm: [styles.leftIcon],
  md: [styles.leftIcon],
  lg: [styles.leftIcon],
  xl: [styles.leftIcon],
  dialog: [styles.leftIcon],
  text: [styles.leftIcon],
};

const rightIconShapeStyles = {
  sm: [styles.rightIcon],
  md: [styles.rightIcon],
  lg: [styles.rightIcon],
  xl: [styles.rightIcon],
  dialog: [styles.rightIcon],
  text: [styles.rightIcon],
};

const iconShapeSize: Record<ButtonShape, IconSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'md',
  dialog: 'md',
  text: 'sm',
};
