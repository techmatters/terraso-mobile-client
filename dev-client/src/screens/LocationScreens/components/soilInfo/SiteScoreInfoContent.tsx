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

import {Divider} from 'react-native-paper';

import {Coords} from 'terraso-client-shared/types';

import {SoilMatchForLocationWithData} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {LocationScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/LocationScoreDisplay';
import {PropertiesScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/PropertiesScoreDisplay';
import {ScoreInfoContainer} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreInfoContainer';
import {SoilIdMatchSelector} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilIdMatchSelector';
import {SoilInfoDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilInfoDisplay';

type SiteScoreInfoContentProps = {
  siteId: string;
  coords: Coords;
  dataMatch: SoilMatchForLocationWithData;
};

export function SiteScoreInfoContent({
  siteId,
  coords,
  dataMatch,
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
        match={dataMatch}
        matchInfo={dataMatch.locationMatch}
        coords={coords}
      />
      <Divider />
      <PropertiesScoreDisplay
        match={dataMatch}
        matchInfo={dataMatch.dataMatch}
      />
      <SoilIdMatchSelector siteId={siteId} match={dataMatch} />
    </ScoreInfoContainer>
  );
}
