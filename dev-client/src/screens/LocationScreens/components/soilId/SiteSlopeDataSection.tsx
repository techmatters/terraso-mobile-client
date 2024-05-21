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
import {Image, StyleSheet} from 'react-native';

import {SoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {selectSoilData} from 'terraso-client-shared/selectors';
import {
  Box,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSelector} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';
import {SOIL_PROPERTIES_TABLE_ROWS} from 'terraso-mobile-client/model/soilId/soilIdPlaceholders';
import {SiteTabName} from 'terraso-mobile-client/navigation/navigators/SiteLocationDashboardTabNavigator';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {STEEPNESS_IMAGES} from 'terraso-mobile-client/screens/SlopeScreen/utils/steepnessImages';
import {renderSteepnessForNarrowDisplay} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';

const getSlopeSteepnessImageSource = (soilData: SoilData) => {
  return soilData.slopeSteepnessSelect
    ? STEEPNESS_IMAGES[soilData.slopeSteepnessSelect]
    : undefined;
};

// TODO-cknipe: Move to another file or don't export
type Props = {siteId: string};
export const SiteSlopeDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const soilData = useSelector(selectSoilData(siteId));

  const onAddSoilDataPress = useCallback(() => {
    navigation.push('LOCATION_DASHBOARD', {
      siteId: siteId,
      initialTab: 'SLOPE' as SiteTabName,
    });
  }, [navigation, siteId]);

  const imageSrc = getSlopeSteepnessImageSource(soilData);
  const steepnessValue = renderSteepnessForNarrowDisplay(t, soilData);

  return (
    <>
      <Heading variant="h6" pt="lg" pb="md">
        {t('site.soil_id.site_data.slope.title')}
      </Heading>

      <Box flexDirection="row">
        <Box borderWidth="2px" width="85px" height="85px" mr="md">
          {imageSrc && <Image style={styles.image} source={imageSrc} />}
        </Box>

        <Box flex={1}>
          <Text bold>{steepnessValue}</Text>
        </Box>

        <RestrictBySiteRole
          role={[
            {kind: 'site', role: 'OWNER'},
            {kind: 'project', role: 'MANAGER'},
            {kind: 'project', role: 'CONTRIBUTOR'},
          ]}>
          <Box paddingVertical="lg">
            <Button
              _text={{textTransform: 'uppercase'}}
              alignSelf="flex-end"
              rightIcon={<Icon name="chevron-right" />}
              onPress={onAddSoilDataPress}>
              {t('site.soil_id.site_data.slope.add_data')}
            </Button>
          </Box>
        </RestrictBySiteRole>
      </Box>
    </>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

// TODO-cknipe: Move to another file or don't export
export const SiteSoilPropertiesDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onAddSoilDataPress = useCallback(() => {
    navigation.push('LOCATION_DASHBOARD', {
      siteId: siteId,
      initialTab: 'SOIL' as SiteTabName,
    });
  }, [navigation, siteId]);

  return (
    <>
      <Heading variant="h6" pt="lg">
        {t('site.soil_id.site_data.soil_properties.title')}
      </Heading>

      <Box marginTop="sm" />
      <SoilPropertiesDataTable rows={SOIL_PROPERTIES_TABLE_ROWS} />

      <RestrictBySiteRole
        role={[
          {kind: 'site', role: 'OWNER'},
          {kind: 'project', role: 'MANAGER'},
          {kind: 'project', role: 'CONTRIBUTOR'},
        ]}>
        <Box paddingVertical="lg">
          <Button
            _text={{textTransform: 'uppercase'}}
            alignSelf="flex-end"
            rightIcon={<Icon name="chevron-right" />}
            onPress={onAddSoilDataPress}>
            {t('site.soil_id.site_data.soil_properties.add_data')}
          </Button>
        </Box>
      </RestrictBySiteRole>
    </>
  );
};

export const SiteDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();

  return (
    <ScreenContentSection title={t('site.soil_id.site_data.title')}>
      <Text variant="body1">{t('site.soil_id.site_data.description')}</Text>
      <SiteSlopeDataSection siteId={siteId} />
      <SiteSoilPropertiesDataSection siteId={siteId} />
    </ScreenContentSection>
  );
};
