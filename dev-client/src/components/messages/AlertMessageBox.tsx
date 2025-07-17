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

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type MessageBoxProps = React.PropsWithChildren<{
  title?: string;
}>;

// TODO-cknipe: Delete this file
export const AlertMessageBox = ({title, children}: MessageBoxProps) => {
  return (
    <Box
      backgroundColor="primary.contrast"
      borderColor="warning.main"
      borderWidth="2px"
      borderRadius="4px"
      padding="md">
      <Row>
        <Icon name="warning-amber" color="warning.main" mr="md" size="md" />
        <Column flex={1}>
          <Text variant="body1-strong" color="warning.content" mb="sm">
            {title}
          </Text>
          {children}
        </Column>
      </Row>
    </Box>
  );
};
