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

import {useState} from 'react';
import {AccessibilityProps} from 'react-native';
import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

import {Button} from 'native-base';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';

export type TextButtonType = 'default' | 'error';

export type TextButtonProps = {
  label: string;
  type?: TextButtonType;
  role: AccessibilityProps['role'];
  leftIcon?: IconName;
  rightIcon?: IconName;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export const TextButton = ({
  label,
  type = 'default',
  role,
  leftIcon,
  rightIcon,
  disabled,
  onPress,
}: TextButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const colors = disabled ? COLORS.disabled : COLORS[type];

  return (
    <Button
      size="md"
      alignSelf="flex-start"
      background="transparent"
      _text={{
        textTransform: 'uppercase',
        textDecoration: 'none',
        color: colors.default,
      }}
      _pressed={{
        background: 'transparent',
        _text: {textDecoration: 'none', color: colors.pressed},
      }}
      leftIcon={
        leftIcon && (
          <Icon
            name={leftIcon}
            color={!pressed ? colors.default : colors.pressed}
          />
        )
      }
      rightIcon={
        rightIcon && (
          <Icon
            name={rightIcon}
            color={!pressed ? colors.default : colors.pressed}
          />
        )
      }
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      role={role}>
      {label}
    </Button>
  );
};

export const COLORS = {
  default: {
    default: 'primary.main',
    pressed: 'primary.dark',
  },
  error: {
    default: 'error.main',
    pressed: 'error.content',
  },
  disabled: {
    default: 'text.disabled',
    pressed: 'text.disabled',
  },
};
