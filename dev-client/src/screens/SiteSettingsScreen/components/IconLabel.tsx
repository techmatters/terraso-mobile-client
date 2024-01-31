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

import {Spacer, Text, useTheme} from 'native-base';
import {Row} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  label: string;
  icon: React.ReactNode;
};

export const IconLabel = ({label, icon}: Props) => {
  const {
    components: {FormControlLabel},
  } = useTheme();

  return (
    <Row alignItems="center">
      <Text {...FormControlLabel.baseStyle()._text}>{label}</Text>
      <Spacer size="4px" />
      {icon}
    </Row>
  );
};
