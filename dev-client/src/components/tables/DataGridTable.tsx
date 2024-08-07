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
import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {Divider} from 'react-native-paper';

import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  headers: string[];
  rows: (string | React.ReactElement)[][];
} & React.ComponentProps<typeof Box>;

export const DataGridTable = ({rows, headers, ...containerProps}: Props) => {
  const textAlign: {textAlign: any} = useMemo(
    () => ({textAlign: headers.length === 1 ? 'center' : undefined}),
    [headers],
  );

  const displayCol = (col: string | React.ReactElement, index: number) => {
    if (typeof col === 'string') {
      return (
        <Box flex={1} key={index} style={styles.row}>
          <Text {...textAlign}>{col}</Text>
        </Box>
      );
    }
    return (
      <Box flex={1} key={index} style={styles.row}>
        {col}
      </Box>
    );
  };

  return (
    <Box {...containerProps}>
      <Row justifyContent="flex-start" variant="tablerow">
        {headers.map((header: (typeof headers)[number], i: number) => (
          <Text
            variant="table-header"
            key={i}
            flex={1}
            py="10px"
            {...textAlign}>
            {header}
          </Text>
        ))}
      </Row>
      <Divider />
      {rows.map((row: (typeof rows)[number], i: number) => (
        <React.Fragment key={i}>
          <Row justifyContent="flex-start" variant="tablerow" py="10px">
            {row.map(displayCol)}
          </Row>
          <Divider />
        </React.Fragment>
      ))}
    </Box>
  );
};

const styles = StyleSheet.create({
  row: {
    alignSelf: 'center',
  },
});
