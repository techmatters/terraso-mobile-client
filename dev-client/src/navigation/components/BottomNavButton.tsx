/*
 * Copyright © 2023 Technology Matters
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

import {Pressable, PressableProps} from 'react-native';

import {Center, IconButton as NativeIconButton} from 'native-base';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type BottomNavButtonProps = {
  name: IconName;
  label: string;
  onPress: PressableProps['onPress'];
};

export const BottomNavButton = ({
  name,
  label,
  onPress,
}: BottomNavButtonProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}>
      <Box p="1">
        <NativeIconButton
          onPress={onPress}
          icon={<Icon name={name} color="primary.contrast" />}
        />
        <Center>
          <Text color="primary.contrast" fontSize="xs">
            {label}
          </Text>
        </Center>
      </Box>
    </Pressable>
  );
};
