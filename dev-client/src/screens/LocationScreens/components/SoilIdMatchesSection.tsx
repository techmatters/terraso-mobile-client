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
import {
  DATA_BASED_SOIL_MATCH,
  LOCATION_BASED_SOIL_MATCH,
} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';
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

  const locationMatch: any = LOCATION_BASED_SOIL_MATCH;
  const dataMatch: any = DATA_BASED_SOIL_MATCH;

  return (
    <ScreenContentSection backgroundColor="grey.200">
      <Row alignItems="center">
        <Heading variant="h6">{t('site.soil_id.matches.title')}</Heading>
        <InfoOverlaySheetButton Header={t('site.soil_id.matches.info.title')}>
          <TopSoilMatchesInfoContent isSite={isSite} />
        </InfoOverlaySheetButton>
      </Row>
      <InfoOverlaySheet
        Header={DATA_BASED_SOIL_MATCH.soilInfo.soilSeries.name}
        trigger={onOpen => (
          <Button backgroundColor="background.secondary" onPress={onOpen}>
            (Match Goes Here)
          </Button>
        )}>
        {isSite ? (
          <SiteScoreInfoContent dataMatch={dataMatch} coords={coords} />
        ) : (
          <TempScoreInfoContent locationMatch={locationMatch} coords={coords} />
        )}
      </InfoOverlaySheet>
    </ScreenContentSection>
  );
};
