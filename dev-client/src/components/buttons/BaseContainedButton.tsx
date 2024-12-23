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
import {StyleSheet, Text} from 'react-native';
import {TouchableRipple, TouchableRippleProps} from 'react-native-paper';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {
  convertColorProp,
  IconSize,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

/*
 * Base component used by both ContainedButton and DialogButton to factor out identical styling logic.
 * Only intended for building higher-level button components; do not use directly unless building a custom button.
 */

export type BaseContainedButtonContext = 'default' | 'dialog';
export type BaseContainedButtonType = 'default' | 'destructive' | 'outlined';
export type BaseContainedButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type BaseContainedButtonProps = {
  label: string;
  type?: BaseContainedButtonType;
  context?: BaseContainedButtonContext;
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  size?: BaseContainedButtonSize;
  stretchToFit?: boolean;
  onPress?: TouchableRippleProps['onPress'];
};

export const BaseContainedButton = ({
  label,
  type = 'default',
  context = 'default',
  leftIcon,
  rightIcon,
  disabled,
  size = 'md',
  stretchToFit,
  onPress,
}: BaseContainedButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const onPressIn = useMemo(() => () => setPressed(true), [setPressed]);
  const onPressOut = useMemo(() => () => setPressed(false), [setPressed]);

  const colorStyles = disabled ? COLOR_STYLES.disabled : COLOR_STYLES[type];
  const colorStyle = pressed ? colorStyles.pressed : colorStyles.default;
  const contextStyle = CONTEXT_STYLES[context];
  const sizeStyle = SIZE_STYLES[size];
  const sizeIcon = SIZE_ICONS[size];
  const stretchStyle = stretchToFit ? styles.containerStretch : undefined;

  return (
    <TouchableRipple
      style={[
        styles.container,
        sizeStyle.container,
        colorStyle.container,
        stretchStyle,
      ]}
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
            size={sizeIcon}
            style={[styles.leftIcon, colorStyle.content]}
          />
        ) : (
          <></>
        )}
        <Text
          style={[
            styles.label,
            sizeStyle.content,
            colorStyle.content,
            contextStyle,
          ]}>
          {label}
        </Text>
        {rightIcon ? (
          <Icon
            name={rightIcon}
            size={sizeIcon}
            style={[styles.rightIcon, colorStyle.content]}
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
    borderWidth: 1,
    borderRadius: 4,
    flexDirection: 'row',
    alignSelf: 'flex-start',
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
    borderColor: convertColorProp('primary.main'),
    backgroundColor: convertColorProp('primary.main'),
  },
  containerDefaultPressed: {
    borderColor: convertColorProp('primary.dark'),
    backgroundColor: convertColorProp('primary.dark'),
  },
  containerDestructive: {
    borderColor: convertColorProp('error.main'),
    backgroundColor: convertColorProp('error.main'),
  },
  containerDestructivePressed: {
    borderColor: convertColorProp('error.dark'),
    backgroundColor: convertColorProp('error.dark'),
  },
  containerOutlined: {
    borderColor: convertColorProp('text.primary'),
    backgroundColor: convertColorProp('transparent'),
  },
  containerOutlinedPressed: {
    borderColor: convertColorProp('text.primary'),
    backgroundColor: convertColorProp('action.selected'),
  },
  containerDisabled: {
    borderColor: convertColorProp('action.disabledBackground'),
    backgroundColor: convertColorProp('action.disabledBackground'),
  },
  contentDefault: {
    color: convertColorProp('primary.contrast'),
  },
  contentDefaultPressed: {
    color: convertColorProp('primary.contrast'),
  },
  contentDestructive: {
    color: convertColorProp('error.contrast'),
  },
  contentDestructivePressed: {
    color: convertColorProp('error.contrast'),
  },
  contentOutlined: {
    color: convertColorProp('text.primary'),
  },
  contentOutlinedPressed: {
    color: convertColorProp('text.primary'),
  },
  contentDisabled: {
    color: convertColorProp('action.disabled'),
  },
  label: {
    fontWeight: '500',
  },
  labelDefault: {
    textTransform: 'uppercase',
  },
  labelDialog: {
    textTransform: 'capitalize',
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

const COLOR_STYLES = {
  default: {
    default: {
      container: styles.containerDefault,
      content: styles.contentDefault,
    },
    pressed: {
      container: styles.containerDefaultPressed,
      content: styles.contentDefaultPressed,
    },
  },
  destructive: {
    default: {
      container: styles.containerDestructive,
      content: styles.contentDestructive,
    },
    pressed: {
      container: styles.containerDestructivePressed,
      content: styles.contentDestructivePressed,
    },
  },
  outlined: {
    default: {
      container: styles.containerOutlined,
      content: styles.contentOutlined,
    },
    pressed: {
      container: styles.containerOutlinedPressed,
      content: styles.contentOutlinedPressed,
    },
  },
  disabled: {
    default: {
      container: styles.containerDisabled,
      content: styles.contentDisabled,
    },
    pressed: {
      container: styles.containerDisabled,
      content: styles.contentDisabled,
    },
  },
};

const CONTEXT_STYLES = {
  default: styles.labelDefault,
  dialog: styles.labelDialog,
};

const SIZE_ICONS: Record<string, IconSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'md',
};

const SIZE_STYLES = {
  sm: {container: styles.containerSm, content: styles.labelSm},
  md: {container: styles.containerMd, content: styles.labelMd},
  lg: {container: styles.containerLg, content: styles.labelLg},
  xl: {container: styles.containerXl, content: styles.labelLg},
};
