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
import {forwardRef} from 'react';
import {PressableProps, View} from 'react-native';

import {Pressable} from 'native-base';

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';
import {Badge} from 'terraso-mobile-client/components/NativeBaseAdapters';

type BadgedIconButtonProps = {
  name: IconName;
  badgeNum: number;
  accessibilityLabel?: string;
  badgeAccessibilityLabel?: string;
  onPress?: PressableProps['onPress'];
};

export const BadgedIconButton = forwardRef<View, BadgedIconButtonProps>(
  (
    {
      name,
      badgeNum,
      accessibilityLabel,
      badgeAccessibilityLabel,
      onPress,
    }: BadgedIconButtonProps,
    ref,
  ) => {
    return (
      <Pressable onPress={onPress}>
        {badgeNum > 0 && (
          <Badge
            variant="notification"
            accessibilityLabel={badgeAccessibilityLabel}>
            {badgeNum}
          </Badge>
        )}
        <IconButton
          ref={ref}
          type="sm"
          variant="light-filled"
          name={name}
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
        />
      </Pressable>
    );
  },
);
