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
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSelector} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';
import {SiteTabName} from 'terraso-mobile-client/navigation/navigators/SiteLocationDashboardTabNavigator';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {selectSoilData} from 'terraso-client-shared/selectors';
import {rowsFromSoilData} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesData';

type Props = {siteId: string};

export const SiteSoilPropertiesDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const soilData = useSelector(selectSoilData(siteId));
  const dataTableRows = rowsFromSoilData(soilData);

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
      <SoilPropertiesDataTable rows={dataTableRows} />

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
