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

import {Button} from 'native-base';

import {Coords} from 'terraso-client-shared/types';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheet} from 'terraso-mobile-client/components/sheets/InfoOverlaySheet';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {useSoilIdData} from 'terraso-mobile-client/hooks/soilIdHooks';
import {SoilMatchTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilMatchTile';
import {SiteScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SiteScoreInfoContent';
import {TempScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/TempScoreInfoContent';
import {TopSoilMatchesInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/TopSoilMatchesInfoContent';

type SoilIdMatchesSectionProps = {siteId?: string; coords: Coords};

export const SoilIdMatchesSection = ({
  siteId,
  coords,
}: SoilIdMatchesSectionProps) => {
  const {t} = useTranslation();
  const isSite = !!siteId;
  const soilIdData = useSoilIdData(coords, siteId);

  return (
    <ScreenContentSection backgroundColor="grey.200">
      <Row alignItems="center" pb="12px">
        <Heading variant="h6">{t('site.soil_id.matches.title')}</Heading>
        <InfoOverlaySheetButton Header={t('site.soil_id.matches.info.title')}>
          <TopSoilMatchesInfoContent isSite={isSite} />
        </InfoOverlaySheetButton>
      </Row>
      {isSite
        ? soilIdData.dataBasedMatches.map(dataMatch => (
            <InfoOverlaySheet
              key={dataMatch.soilInfo.soilSeries.name}
              Header={dataMatch.soilInfo.soilSeries.name}
              trigger={onOpen => (
                <SoilMatchTile
                  soil_name={dataMatch.soilInfo.soilSeries.name}
                  score={dataMatch.combinedMatch.score} //TODO-cknipe: Also sort by combinedMatch.rank
                  onPress={onOpen}
                />
              )}>
              <SiteScoreInfoContent dataMatch={dataMatch} coords={coords} />
            </InfoOverlaySheet>
          ))
        : soilIdData.locationBasedMatches.map(locationMatch => (
            <InfoOverlaySheet
              key={locationMatch.soilInfo.soilSeries.name}
              Header={locationMatch.soilInfo.soilSeries.name}
              trigger={onOpen => (
                <SoilMatchTile
                  soil_name={locationMatch.soilInfo.soilSeries.name}
                  score={locationMatch.match.score} //TODO-cknipe: Sort them by match.rank
                  onPress={onOpen}
                />
              )}>
              <TempScoreInfoContent
                locationMatch={locationMatch}
                coords={coords}
              />
            </InfoOverlaySheet>
          ))}
    </ScreenContentSection>
  );
};
