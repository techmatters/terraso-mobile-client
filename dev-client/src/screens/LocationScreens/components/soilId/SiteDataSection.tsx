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

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {SiteSlopeDataSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SiteSlopeDataSection';
import {SiteSoilCracksSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SiteSoilCracksSection';
import {SiteSoilPropertiesDataSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SiteSoilPropertiesDataSection';

type Props = {
  siteId: string;
};

export const SiteDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();

  const soilIdOutput = useSoilIdOutput({siteId});
  const dataRegion = soilIdOutput.dataRegion;

  return (
    <ScreenContentSection title={t('site.soil_id.site_data.title')}>
      <Text variant="body1">{t('site.soil_id.site_data.description')}</Text>
      {dataRegion !== 'GLOBAL' && <SiteSlopeDataSection siteId={siteId} />}
      <SiteSoilCracksSection siteId={siteId} />
      <SiteSoilPropertiesDataSection siteId={siteId} />
    </ScreenContentSection>
  );
};
