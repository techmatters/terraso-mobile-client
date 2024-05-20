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
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';
import {Divider} from 'native-base';
import {PropertiesScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/PropertiesScoreDisplay';
import {LocationScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/LocationScoreDisplay';
import {ScoreInfoContainer} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreInfoContainer';
import {Coords} from 'terraso-client-shared/types';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

type SiteScoreInfoContentProps = {
  locationMatch: LocationBasedSoilMatch;
  soilData: SoilData;
  dataMatch: DataBasedSoilMatch;
  coords: Coords;
};

export function SiteScoreInfoContent({
  locationMatch,
  soilData,
  dataMatch,
  coords,
}: SiteScoreInfoContentProps) {
  return (
    <ScoreInfoContainer>
      <SoilInfoDisplay
        dataSource={dataMatch.dataSource}
        soilInfo={dataMatch.soilInfo}
      />
      <Divider />
      <LocationScoreDisplay
        isSite={true}
        match={locationMatch}
        coords={coords}
      />
      <Divider />
      <PropertiesScoreDisplay data={soilData} match={dataMatch} />
    </ScoreInfoContainer>
  );
}
