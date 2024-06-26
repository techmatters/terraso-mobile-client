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

import {useMemo} from 'react';
import {Text} from 'react-native';
import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

import {Button} from 'native-base';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';

export type ListButtonType = 'default' | 'error';

export type ListButtonProps = {
  type: ListButtonType;
  labelText: string;
  subLabelText?: string;
  iconName: IconName;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export function ListButton({
  type = 'default',
  iconName,
  labelText,
  subLabelText,
  disabled,
  onPress,
}: ListButtonProps) {
  const {color, pressedColor} = useMemo(() => {
    if (disabled) {
      return COLORS.disabled;
    } else if (type === 'error') {
      return COLORS.error;
    } else {
      return COLORS.default;
    }
  }, [disabled, type]);

  return (
    <Button
      size="md"
      variant="ghost"
      alignSelf="flex-start"
      _text={{color: color, textTransform: 'uppercase'}}
      leftIcon={iconName ? <Icon name={iconName} color={color} /> : undefined}
      _pressed={{backgroundColor: pressedColor}}
      disabled={disabled}
      onPress={onPress}>
      {labelText}
      {subLabelText && <Text>{subLabelText}</Text>}
    </Button>
  );
}

const COLORS = {
  disabled: {
    color: 'text.disabled',
    pressedColor: undefined,
  },
  default: {
    color: 'text.primary',
    pressedColor: undefined,
  },
  error: {
    color: 'error.main',
    pressedColor: 'red.100',
  },
};
