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

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {rowsFromSiteSoilData} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesData';
import {SoilPropertiesDataTable} from 'terraso-mobile-client/components/tables/soilProperties/SoilPropertiesDataTable';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {useSiteTabJumpContext} from 'terraso-mobile-client/navigation/components/SiteTabJumpProvider';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSoilData,
  useSiteSoilIntervals,
} from 'terraso-mobile-client/store/selectors';

type Props = {siteId: string};

export const SiteSoilPropertiesDataSection = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {setNextSiteTab} = useSiteTabJumpContext();

  const allDepths = useSiteSoilIntervals(siteId);
  const soilData = useSelector(selectSoilData(siteId));
  const dataTableRows = rowsFromSiteSoilData(soilData, allDepths);

  const onAddSoilDataPress = useCallback(() => {
    setNextSiteTab('SOIL');
    navigation.popTo('SITE_TABS', {
      siteId: siteId,
    });
  }, [navigation, siteId, setNextSiteTab]);

  return (
    <>
      <Heading variant="h6" pt="lg">
        {t('site.soil_id.site_data.soil_properties.title')}
      </Heading>

      <Box marginTop="sm" />
      <SoilPropertiesDataTable rows={dataTableRows} />
      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <Box paddingVertical="lg" alignItems="flex-start">
          <ContainedButton
            rightIcon="chevron-right"
            onPress={onAddSoilDataPress}
            label={t('site.soil_id.site_data.soil_properties.add_data')}
          />
        </Box>
      </RestrictBySiteRole>
    </>
  );
};
