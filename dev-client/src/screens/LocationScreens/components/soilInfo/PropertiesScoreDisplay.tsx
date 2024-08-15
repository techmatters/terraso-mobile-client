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

import {
  DataBasedSoilMatch,
  SoilMatchInfo,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {rowsFromSoilIdData} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesData';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';
import {ScoreTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreTile';
import {SoilPropertiesScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilPropertiesScoreInfoContent';

type PropertiesScoreDisplayProps = {
  match: DataBasedSoilMatch;
  matchInfo: SoilMatchInfo;
};

export function PropertiesScoreDisplay({
  match,
  matchInfo,
}: PropertiesScoreDisplayProps) {
  const {t} = useTranslation();
  const rows = useMemo(
    () => rowsFromSoilIdData(match.soilInfo.soilData),
    [match.soilInfo.soilData],
  );
  return (
    <Column space="16px">
      <Row justifyContent="space-between" alignItems="center">
        <Row alignItems="stretch" maxWidth="75%">
          <Heading variant="h6">
            {t('site.soil_id.soil_properties_score_info.header')}
          </Heading>
          <HelpContentSpacer />
          <InfoButton
            Header={t('site.soil_id.soil_properties_score_info.header')}>
            <SoilPropertiesScoreInfoContent />
          </InfoButton>
        </Row>
        <ScoreTile score={matchInfo.score} />
      </Row>
      <SoilPropertiesDataTable rows={rows} />
    </Column>
  );
}
