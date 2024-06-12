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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {LocationBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {rowsFromSoilIdData} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesData';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';

type PropertiesDisplayProps = {
  match: LocationBasedSoilMatch;
};

export function PropertiesDisplay({match}: PropertiesDisplayProps) {
  const {t} = useTranslation();
  const rows = useMemo(
    () => rowsFromSoilIdData(match.soilInfo.soilData),
    [match.soilInfo.soilData],
  );
  return (
    <Column space="16px">
      <Heading variant="h6">
        {t('site.soil_id.soil_info.properties_header')}
      </Heading>
      <SoilPropertiesDataTable rows={rows} />
    </Column>
  );
}
