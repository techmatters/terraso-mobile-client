/*
 * Copyright © 2023–2024 Technology Matters
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

import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';

type BigCloseButtonProps = {
  onPress?: PressableProps['onPress'];
};

export const BigCloseButton = ({onPress}: BigCloseButtonProps) => {
  return (
    <IconButton
      name="close"
      size="lg"
      background="grey.200"
      _icon={iconProps}
      borderRadius="full"
      onPress={onPress}
    />
  );
};

const iconProps = {color: 'action.active'};
