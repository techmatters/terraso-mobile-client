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
import {IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type TextButtonType = 'default' | 'destructive' | 'alertError';

export type TextButtonProps = {
  label: string;
  type?: TextButtonType;
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export const TextButton = ({
  label,
  type = 'default',
  leftIcon,
  rightIcon,
  disabled,
  onPress,
}: TextButtonProps) => {
  return (
    <BaseButton
      label={label}
      shape="text"
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      containerStyles={CONTAINER_STYLES}
      contentStyles={CONTENT_STYLES[type]}
      disabled={disabled}
      onPress={onPress}
    />
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

const CONTAINER_STYLES = {
  default: styles.containerDefault,
  pressed: styles.containerPressed,
};

const CONTENT_STYLES = {
  default: {
    default: styles.contentDefault,
    disabled: styles.contentDisabled,
  },
  destructive: {
    default: styles.contentDestructive,
    disabled: styles.contentDisabled,
  },
  alertError: {
    default: styles.contentAlertError,
    disabled: styles.contentDisabled,
  },
};
