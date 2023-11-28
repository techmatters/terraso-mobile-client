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
import {Badge, Pressable} from 'native-base';
import {IconButton} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  _badge?: {} & Omit<React.ComponentProps<typeof Badge>, 'variant'>;
  _iconButton?: {} & Omit<
    React.ComponentProps<typeof IconButton>,
    'onPress' | 'name' | 'accessibilityLabel'
  >;
  badgeNum: number;
  iconName: string;
  accessibilityLabel?: string;
} & React.ComponentProps<typeof Pressable>;

const BadgedIcon = ({
  badgeNum,
  iconName,
  onPress,
  _badge = {},
  _iconButton = {},
  accessibilityLabel,
  ...pressableProps
}: Props) => {
  return (
    <Pressable {...pressableProps}>
      {badgeNum > 0 && (
        <Badge variant="notification" {..._badge}>
          {badgeNum}
        </Badge>
      )}
      <IconButton
        name={iconName}
        {..._iconButton}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      />
    </Pressable>
  );
};

export default BadgedIcon;
