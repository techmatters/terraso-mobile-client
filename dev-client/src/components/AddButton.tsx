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

import {Button, HStack, Text} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/Icons';

type Props = {
  text: string;
  buttonProps?: any;
};

export const AddButton = ({text, buttonProps}: Props) => {
  return (
    <Button bg="primary.main" size="xs" {...buttonProps}>
      <HStack alignItems="center">
        <Icon name="add" color="primary.contrast" size="sm" mr="1" />
        <Text color="primary.contrast" fontSize="xs" alignContent="center">
          {text.toUpperCase()}
        </Text>
      </HStack>
    </Button>
  );
};
