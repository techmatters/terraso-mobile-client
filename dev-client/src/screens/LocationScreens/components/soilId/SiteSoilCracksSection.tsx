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
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSoilData} from 'terraso-mobile-client/store/selectors';

type Props = {siteId: string};
export const SiteSoilCracksSection = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const soilData = useSelector(selectSoilData(siteId));

  const onAddSoilCracksDataPress = useCallback(() => {
    navigation.push('SOIL_SURFACE', {siteId});
  }, [navigation, siteId]);

  return (
    <>
      <Heading variant="h6" pt="lg" pb="md">
        {t('site.soil_id.site_data.cracks.title')}
      </Heading>

      {soilData.surfaceCracksSelect ? (
        <Text>
          {t(`soil.vertical_cracking.value.${soilData.surfaceCracksSelect}`)}
        </Text>
      ) : (
        <></>
      )}

      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <Box paddingVertical="lg" alignItems="flex-end">
          <ContainedButton
            rightIcon="chevron-right"
            onPress={onAddSoilCracksDataPress}
            label={t('site.soil_id.site_data.cracks.add_data')}
          />
        </Box>
      </RestrictBySiteRole>
    </>
  );
};
