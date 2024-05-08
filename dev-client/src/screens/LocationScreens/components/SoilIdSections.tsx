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
import {InfoModal} from 'terraso-mobile-client/components/modals/infoModals/InfoModal';
import {
  TopSoilMatchesInfoContent_Site,
  TopSoilMatchesInfoContent_TempLocation,
} from 'terraso-mobile-client/screens/LocationScreens/components/TopSoilMatchesInfoContent';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';

type SoilIdSectionProps = {siteId?: string};
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

export const SoilIdMatchesSection = ({siteId}: SoilIdSectionProps) => {
  const {t} = useTranslation();

  return (
    <ScreenContentSection backgroundColor="grey.200">
      <Row alignItems="center">
        <Heading variant="h6">{t('site.soil_id.matches.title')}</Heading>
        <InfoModal Header={t('site.soil_id.matches.info.title')}>
          {siteId ? (
            <TopSoilMatchesInfoContent_Site />
          ) : (
            <TopSoilMatchesInfoContent_TempLocation />
          )}
        </InfoModal>
      </Row>
    </ScreenContentSection>
  );
};
