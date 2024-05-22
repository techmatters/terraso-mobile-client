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

import {Divider} from 'native-base';

import {LocationBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {LocationScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/LocationScoreDisplay';
import {PropertiesDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/PropertiesDisplay';
import {ScoreInfoContainer} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreInfoContainer';
import {SoilInfoDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilInfoDisplay';

type TempScoreInfoContentProps = {
  locationMatch: LocationBasedSoilMatch;
  coords: Coords;
};

export function TempScoreInfoContent({
  locationMatch,
  coords,
}: TempScoreInfoContentProps) {
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
      <PropertiesDisplay match={locationMatch} />
      <CreateSiteButton coords={coords} />
    </ScoreInfoContainer>
  );
}
