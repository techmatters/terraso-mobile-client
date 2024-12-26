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
  onPress?: PressableProps['onPress'];
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
  return (
    <BaseButton
      label={label}
      shape={size}
      stretchToFit={stretchToFit}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      container={CONTAINER_STYLES}
      content={CONTENT_STYLES}
      disabled={disabled}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
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
  default: styles.containerDefault,
  pressed: styles.containerDefaultPressed,
  disabled: styles.containerDisabled,
};

const CONTENT_STYLES = {
  default: styles.contentDefault,
  disabled: styles.contentDisabled,
};
