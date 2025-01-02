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

import {PressableProps, StyleSheet} from 'react-native';

import {BaseButton} from 'terraso-mobile-client/components/buttons/BaseButton';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type DialogButtonType =
  | 'default'
  | 'destructive'
  /*
   * Note: the "outlined" type is *NOT* the same as the OutlinedButton; this is a variant of the same
   * shape as the other dialog buttons.
   */
  | 'outlined'
  | 'alertError';

export type DialogButtonProps = {
  label: string;
  type?: DialogButtonType;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export const DialogButton = ({
  label,
  type = 'default',
  disabled,
  onPress,
}: DialogButtonProps) => {
  return (
    <BaseButton
      label={label}
      shape="dialog"
      containerStyles={CONTAINER_STYLES[type]}
      contentStyles={CONTENT_STYLES[type]}
      disabled={disabled}
      onPress={onPress}
    />
  );
};

export type BaseContainedButtonProps = {
  label: string;
  type?: DialogButtonType;
  onPress?: PressableProps['onPress'];
};

const styles = StyleSheet.create({
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
  containerAlertError: {
    borderColor: convertColorProp('error.content'),
    backgroundColor: convertColorProp('transparent'),
  },
  containerDisabled: {
    backgroundColor: convertColorProp('action.disabledBackground'),
    borderColor: convertColorProp('action.disabledBackground'),
  },
  contentDefault: {
    color: convertColorProp('primary.contrast'),
  },
  contentDestructive: {
    color: convertColorProp('error.contrast'),
  },
  contentOutlined: {
    color: convertColorProp('text.primary'),
  },
  contentAlertError: {
    color: convertColorProp('error.content'),
  },
  contentDisabled: {
    color: convertColorProp('action.disabled'),
  },
});

const CONTAINER_STYLES = {
  default: {
    default: styles.containerDefault,
    pressed: styles.containerDefaultPressed,
    disabled: styles.containerDisabled,
  },
  destructive: {
    default: styles.containerDestructive,
    pressed: styles.containerDestructivePressed,
    disabled: styles.containerDisabled,
  },
  outlined: {
    default: styles.containerOutlined,
    pressed: styles.containerOutlinedPressed,
    disabled: styles.containerDisabled,
  },
  alertError: {
    default: styles.containerAlertError,
    pressed: styles.containerAlertError,
    disabled: styles.containerDisabled,
  },
};

const CONTENT_STYLES = {
  default: {default: styles.contentDefault, disabled: styles.contentDisabled},
  destructive: {
    default: styles.contentDestructive,
    disabled: styles.contentDisabled,
  },
  outlined: {default: styles.contentOutlined, disabled: styles.contentDisabled},
  alertError: {
    default: styles.contentAlertError,
    disabled: styles.contentDisabled,
  },
};
