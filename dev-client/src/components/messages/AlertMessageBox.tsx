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
import {theme} from 'terraso-mobile-client/theme';

type MessageBoxProps = React.PropsWithChildren<{
  title?: string;
}>;

export const AlertMessageBox = ({title, children}: MessageBoxProps) => {
  return (
    <Box
      backgroundColor={theme.colors.primary.contrast}
      borderColor={theme.colors.warning.main}
      borderWidth="2px"
      borderRadius="4px"
      padding="md">
      <Row>
        <Icon name="warning-amber" color={theme.colors.warning.main} mr="md" />
        <Column flex={1}>
          <Text
            variant="body1-strong"
            color={theme.colors.alert.warningContent}
            mb="sm">
            {title}
          </Text>
          {children}
        </Column>
      </Row>
    </Box>
  );
};
