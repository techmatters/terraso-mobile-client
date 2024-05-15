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
  Heading,
  HStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {DataBasedSoilMatch} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';
import {SoilPropertiesScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilPropertiesScoreInfoContent';
import {ScoreTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreTile';

type PropertiesScoreDisplayProps = {
  match: DataBasedSoilMatch;
};

export function PropertiesScoreDisplay({match}: PropertiesScoreDisplayProps) {
  const {t} = useTranslation();
  return (
    <HStack justifyContent="space-between" alignItems="center">
      <Heading variant="h6" pb="10px" maxWidth={'50%'}>
        {t('site.soil_id.soil_properties_score_info.header')}
        <InfoOverlaySheetButton
          Header={t('site.soil_id.soil_properties_score_info.header')}>
          <SoilPropertiesScoreInfoContent />
        </InfoOverlaySheetButton>
      </Heading>
      <ScoreTile score={match.combinedMatch.score} />
    </HStack>
  );
}
