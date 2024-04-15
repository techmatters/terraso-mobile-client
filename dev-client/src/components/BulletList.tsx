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

import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props<T> = {data: T[]; renderItem: (t: T) => React.ReactNode};
export const BulletList = <T,>({data, renderItem}: Props<T>) => {
  const bulletMargin = 10;
  return (
    <Column>
      {data.map((item, index) => (
        <Row key={index} alignItems="flex-start">
          <Text variant="body1" marginHorizontal={`${bulletMargin}px`}>
            {'•'}
          </Text>
          <Box mr={`${bulletMargin * 2}px`}>{renderItem(item)}</Box>
        </Row>
      ))}
      <Text variant="body1" />
    </Column>
  );
};
