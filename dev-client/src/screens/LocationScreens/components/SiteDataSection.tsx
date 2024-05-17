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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from 'native-base';

import {
  Box,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/SoilPropertiesDataTable';
import {SOIL_PROPERTIES_TABLE_ROWS} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';

type Props = {siteId: string};
export const SiteSoilPropertiesDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onAddSoilDataPress = useCallback(() => {
    navigation.navigate('LOCATION_DASHBOARD', {siteId});
  }, [navigation, siteId]);

  return (
    <>
      <Heading variant="h6" pt="lg">
        {t('site.soil_id.site_data.soil_properties.title')}
      </Heading>

      <Box marginTop="sm" />
      <SoilPropertiesDataTable rows={SOIL_PROPERTIES_TABLE_ROWS} />

      <Box paddingVertical="lg">
        <Button
          _text={{textTransform: 'uppercase'}}
          alignSelf="flex-end"
          rightIcon={<Icon name="chevron-right" />}
          onPress={onAddSoilDataPress}>
          {t('site.soil_id.site_data.soil_properties.add_data')}
        </Button>
      </Box>
    </>
  );
};

export const SiteDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();

  return (
    <ScreenContentSection title={t('site.soil_id.site_data.title')}>
      <Text variant="body1">{t('site.soil_id.site_data.description')}</Text>
      <Heading variant="h6" pt="lg">
        {t('site.soil_id.site_data.slope.title')}
      </Heading>

      <SiteSoilPropertiesDataSection siteId={siteId} />
    </ScreenContentSection>
  );
};
