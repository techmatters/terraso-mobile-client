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

import {Box, Row, Text} from 'native-base';
import {Pressable} from 'react-native';
import {Icon} from 'terraso-mobile-client/components/Icons';

type Props = {
  required: boolean;
  complete: boolean;
  label: string;
  value?: string;
  onPress: () => void;
};
export const DataInputSummary = ({
  required,
  complete,
  label,
  value,
  onPress,
}: Props) => (
  <Pressable onPress={onPress}>
    <Row
      backgroundColor={complete ? 'primary.lightest' : 'primary.contrast'}
      p="15px">
      <Box width="37px">
        {(complete || required) && (
          <Icon
            color={complete ? 'primary.dark' : undefined}
            name={
              complete && required
                ? 'check-circle'
                : complete
                  ? 'check'
                  : 'radio-button-unchecked'
            }
          />
        )}
      </Box>
      <Text variant="body1" fontWeight={700} textTransform={'uppercase'}>
        {label}
      </Text>
      <Box flex={1} />
      <Text variant="body1">{value}</Text>
    </Row>
  </Pressable>
);
