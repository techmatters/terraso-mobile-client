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

import {VStack} from 'native-base';

import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';
import {
  LocationBasedSoilMatch,
  SOIL_PROPERTIES_TABLE_ROWS,
} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';

type PropertiesDisplayProps = {
  match: LocationBasedSoilMatch;
};

export function PropertiesDisplay({}: PropertiesDisplayProps) {
  const {t} = useTranslation();
  return (
    <VStack space="16px">
      <Heading variant="h6">
        {t('site.soil_id.soil_info.properties_header')}
      </Heading>
      <SoilPropertiesDataTable rows={SOIL_PROPERTIES_TABLE_ROWS} />
    </VStack>
  );
}
