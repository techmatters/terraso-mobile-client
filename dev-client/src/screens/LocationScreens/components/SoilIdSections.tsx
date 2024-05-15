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
  Text,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {TopSoilMatchesInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/TopSoilMatchesInfoContent';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {
  DATA_BASED_SOIL_MATCH,
  LOCATION_BASED_SOIL_MATCH,
} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';
import {SiteScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SiteScoreInfoContent';
import {InfoOverlaySheet} from 'terraso-mobile-client/components/sheets/InfoOverlaySheet';
import {Button} from 'native-base';
import {TempScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/TempScoreInfoContent';

type SoilIdSectionProps = {siteId?: string; coords: Coords};

export const SoilIdDescriptionSection = ({siteId}: SoilIdSectionProps) => {
  const {t} = useTranslation();
  return (
    <ScreenContentSection title={t('site.soil_id.title')}>
      <Text variant="body1">
        {siteId
          ? t('site.soil_id.description.site')
          : t('site.soil_id.description.temp_location')}
      </Text>
    </ScreenContentSection>
  );
};

export const SoilIdMatchesSection = ({siteId, coords}: SoilIdSectionProps) => {
  const {t} = useTranslation();
  const isSite = !!siteId;

  const locationMatch = LOCATION_BASED_SOIL_MATCH;
  const dataMatch = DATA_BASED_SOIL_MATCH;

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
          <SiteScoreInfoContent
            locationMatch={locationMatch}
            dataMatch={dataMatch}
            coords={coords}
          />
        ) : (
          <TempScoreInfoContent locationMatch={locationMatch} coords={coords} />
        )}
      </InfoOverlaySheet>
    </ScreenContentSection>
  );
};
