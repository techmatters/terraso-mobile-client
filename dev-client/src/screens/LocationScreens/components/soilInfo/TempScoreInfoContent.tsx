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

import {SoilInfoDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilInfoDisplay';
import {
  LocationBasedSoilMatch,
  SOIL_PROPERTIES_TABLE_ROWS,
} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';
import {Divider} from 'native-base';
import {LocationScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/LocationScoreDisplay';
import {ScoreInfoContainer} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreInfoContainer';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {Coords} from 'terraso-client-shared/types';
import {ScrollView} from 'react-native-gesture-handler';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/SoilPropertiesDataTable';
import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useTranslation} from 'react-i18next';

type TempScoreInfoContentProps = {
  locationMatch: LocationBasedSoilMatch;
  coords: Coords;
};

export function TempScoreInfoContent({
  locationMatch,
  coords,
}: TempScoreInfoContentProps) {
  const {t} = useTranslation();
  return (
    <ScoreInfoContainer>
      <SoilInfoDisplay
        dataSource={locationMatch.dataSource}
        soilInfo={locationMatch.soilInfo}
      />
      <Divider />
      <LocationScoreDisplay
        isSite={false}
        match={locationMatch}
        coords={coords}
      />
      <Divider />
      <Heading variant="h6">
        {t('site.soil_id.soil_info.properties_header')}
      </Heading>
      <ScrollView horizontal={true}>
        <SoilPropertiesDataTable rows={SOIL_PROPERTIES_TABLE_ROWS} />
      </ScrollView>
      <CreateSiteButton coords={coords} />
    </ScoreInfoContainer>
  );
}
