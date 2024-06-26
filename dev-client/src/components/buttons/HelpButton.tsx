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

import {forwardRef} from 'react';
import {PressableProps} from 'react-native-paper/lib/typescript/components/TouchableRipple/Pressable';

import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';

type HelpButtonProps = {
  onPress?: PressableProps['onPress'];
};

export const HelpButton = forwardRef(({onPress}: HelpButtonProps, ref) => (
  <IconButton
    ref={ref}
    _icon={iconProps}
    ml="6px"
    p="0"
    name="help"
    onPress={onPress}
  />
));

const iconProps = {color: 'action.active_subtle', size: 'md'};
