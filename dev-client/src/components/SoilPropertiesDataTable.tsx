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
      variant="table-header"
      width={width}
      paddingHorizontal={'sm'}
      pb={'sm'}
      alignSelf={'flex-end'}>
      {text}
    </Text>
  );
};

type DataTableCellProps = {
  text: string;
  index: number;
  width: NBDimensionValue;
};
const DataTableCell = ({text, index, width}: DataTableCellProps) => {
  return (
    <Box
      flex={1}
      key={index}
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

type Props = {
  rows: [string, string, string, string][];
} & React.ComponentProps<typeof Box>;

export const SoilPropertiesDataTable = ({rows, ...containerProps}: Props) => {
  const {t} = useTranslation();

  const columnWidthDepth: NBDimensionValue = '80px';
  const columnWidthTexture: NBDimensionValue = '100px';
  const columnWidthColor: NBDimensionValue = '100px';
  const columnWidthRockFragment: NBDimensionValue = '80px';

  return (
    <Box {...containerProps}>
      <Row justifyContent="flex-start">
        <DataTableHeader
          width={columnWidthDepth}
          text={t('site.soil_id.site_data.soil_properties.depth')}
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

      <Box borderTopWidth={'1px'} borderLeftWidth={'1px'}>
        {rows.map((row: (typeof rows)[number], i: number) => (
          <Row justifyContent="flex-start" key={i}>
            <DataTableCell text={row[0]} index={0} width={columnWidthDepth} />
            <DataTableCell text={row[1]} index={1} width={columnWidthTexture} />
            <DataTableCell text={row[2]} index={2} width={columnWidthColor} />
            <DataTableCell
              text={row[3]}
              index={3}
              width={columnWidthRockFragment}
            />
          </Row>
        ))}
      </Box>
    </Box>
  );
};
