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

import {TouchableRippleProps} from 'react-native-paper';

import {BaseContainedButton} from 'terraso-mobile-client/components/Buttons/BaseContainedButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';

export type ContainedButtonSize = 'sm' | 'md' | 'lg';

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
}: ContainedButtonProps) => (
  <BaseContainedButton
    label={label}
    leftIcon={leftIcon}
    rightIcon={rightIcon}
    disabled={disabled}
    size={size}
    stretchToFit={stretchToFit}
    onPress={onPress}
  />
);
