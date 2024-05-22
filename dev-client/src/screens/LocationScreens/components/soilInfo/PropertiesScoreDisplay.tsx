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

import {DataBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  Heading,
  HStack,
  Row,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {rowsFromSoilIdData} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesData';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';
import {ScoreTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreTile';
import {SoilPropertiesScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilPropertiesScoreInfoContent';

type PropertiesScoreDisplayProps = {
  data: SoilData;
  match: DataBasedSoilMatch;
};

export function PropertiesScoreDisplay({match}: PropertiesScoreDisplayProps) {
  const {t} = useTranslation();
  const rows = useMemo(
    () => rowsFromSoilIdData(match.soilInfo.soilData),
    [match.soilInfo.soilData],
  );
  return (
    <VStack space="16px">
      <HStack justifyContent="space-between" alignItems="center">
        <Row alignItems="stretch" maxWidth="75%">
          <Heading variant="h6">
            {t('site.soil_id.soil_properties_score_info.header')}
          </Heading>
          <InfoOverlaySheetButton
            Header={t('site.soil_id.soil_properties_score_info.header')}>
            <SoilPropertiesScoreInfoContent />
          </InfoOverlaySheetButton>
        </Row>
        <ScoreTile score={match.combinedMatch.score} />
      </HStack>
      <SoilPropertiesDataTable rows={rows} />
    </VStack>
  );
}
