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

import {Badge, HStack, Text} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  iconName: string;
  label: string | number;
};

export default function IconChip({iconName, label}: Props) {
  return (
    <Badge bg="primary.lightest" borderRadius={10} px={2} py={1}>
      <HStack space={3}>
        <Icon name={iconName} />
        <Text>{label}</Text>
      </HStack>
    </Badge>
  );
}
