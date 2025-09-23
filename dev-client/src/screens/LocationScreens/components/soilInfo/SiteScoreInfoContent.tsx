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

import {SoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {LocationScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/LocationScoreDisplay';
import {PropertiesDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/PropertiesDisplay';
import {PropertiesScoreDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/PropertiesScoreDisplay';
import {ScoreInfoContainer} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreInfoContainer';
import {SoilIdMatchSelector} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilIdMatchSelector';
import {SoilInfoDisplay} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilInfoDisplay';

type SiteScoreInfoContentProps = {
  siteId: string;
  coords: Coords;
  dataRegion: DataRegion;
  siteMatch: SoilMatch;
};

export function SiteScoreInfoContent({
  siteId,
  coords,
  dataRegion,
  siteMatch,
}: SiteScoreInfoContentProps) {
  return (
    <ScoreInfoContainer>
      <SoilInfoDisplay
        dataRegion={dataRegion}
        dataSource={siteMatch.dataSource}
        soilInfo={siteMatch.soilInfo}
      />
      <Divider />
      <LocationScoreDisplay
        isSite={true}
        dataRegion={dataRegion}
        match={siteMatch}
        matchInfo={siteMatch.locationMatch}
        coords={coords}
      />
      <Divider />
      {siteMatch.dataMatch ? (
        <PropertiesScoreDisplay
          match={siteMatch}
          matchInfo={siteMatch.dataMatch ?? undefined}
        />
      ) : (
        <PropertiesDisplay match={siteMatch} />
      )}
      {isFlagEnabled('FF_select_soil') ? (
        <Box height="16px" />
      ) : (
        <SoilIdMatchSelector siteId={siteId} match={siteMatch} />
      )}
    </ScoreInfoContainer>
  );
}
