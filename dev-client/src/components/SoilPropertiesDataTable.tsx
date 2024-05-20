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

import {ScrollView} from 'native-base';
import {useTranslation} from 'react-i18next';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {NBDimensionValue} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

type DataTableHeaderProps = {
  width: NBDimensionValue;
  text: string;
};
const DataTableHeader = ({width, text}: DataTableHeaderProps) => {
  return (
    <Text
      variant="body1-medium"
      width={width}
      paddingHorizontal="sm"
      pb="sm"
      alignSelf="flex-end">
      {text}
    </Text>
  );
};

type DataTableCellProps = {
  width: NBDimensionValue;
  text: string;
};
const DataTableCell = ({width, text}: DataTableCellProps) => {
  return (
    <Box
      flex={1}
      width={width}
      borderRightWidth="1px"
      borderBottomWidth="1px"
      paddingHorizontal="8px"
      paddingVertical="4px"
      justifyContent="center">
      <Text>{text}</Text>
    </Box>
  );
};

export type SoilPropertiesDataTableRow = [string, string, string, string];
type Props = {
  rows: SoilPropertiesDataTableRow[];
} & React.ComponentProps<typeof Box>;

export const SoilPropertiesDataTable = ({rows}: Props) => {
  const {t} = useTranslation();

  const columnWidthDepth: NBDimensionValue = '85px';
  const columnWidthTexture: NBDimensionValue = '115px';
  const columnWidthColor: NBDimensionValue = '110px';
  const columnWidthRockFragment: NBDimensionValue = '110px';

  // React wants a `key` prop on components rendered with map, for DOM reconciliation purposes.
  // However, using the index alone for the key is an anti-pattern,
  // as that can cause an issue if list items are rearranged, added, or removed.
  // This should be a sufficiently unique id for our purposes;
  // I expect the data to be unique for each row -- unless the entire row is empty,
  // in which case I expect using the index to be fine.
  // And I don't expect there to be much rearranging of items anyway.
  const uniqueKeyForRow = (row: SoilPropertiesDataTableRow, index: number) => {
    return row[0] + row[1] + row[2] + row[3] + index.toString();
  };

  return (
    <ScrollView horizontal={true}>
      <Box>
        <Row justifyContent="flex-start">
          <DataTableHeader
            width={columnWidthDepth}
            text={t('site.soil_id.site_data.soil_properties.depth', {
              units: 'METRIC',
            })}
          />
          <DataTableHeader
            width={columnWidthTexture}
            text={t('site.soil_id.site_data.soil_properties.texture')}
          />
          <DataTableHeader
            width={columnWidthColor}
            text={t('site.soil_id.site_data.soil_properties.color')}
          />
          <DataTableHeader
            width={columnWidthRockFragment}
            text={t('site.soil_id.site_data.soil_properties.rock_fragment')}
          />
        </Row>

        <Box borderTopWidth="1px" borderLeftWidth="1px">
          {rows.map((row: (typeof rows)[number], i: number) => (
            <Row justifyContent="flex-start" key={uniqueKeyForRow(row, i)}>
              <DataTableCell text={row[0]} width={columnWidthDepth} />
              <DataTableCell text={row[1]} width={columnWidthTexture} />
              <DataTableCell text={row[2]} width={columnWidthColor} />
              <DataTableCell text={row[3]} width={columnWidthRockFragment} />
            </Row>
          ))}
        </Box>
      </Box>
    </ScrollView>
  );
};
