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

import {Coords} from 'terraso-client-shared/types';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

type SoilIdDescriptionSectionProps = {siteId?: string; coords: Coords};

export const SoilIdDescriptionSection = ({
  siteId,
}: SoilIdDescriptionSectionProps) => {
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
