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
import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Image} from 'react-native';

import {
  SurfaceCracks,
  surfaceCracks,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {DoneButton} from 'terraso-mobile-client/components/buttons/DoneButton';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  Box,
  Column,
  Heading,
  Paragraph,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {
  isProjectViewer,
  SITE_EDITOR_ROLES,
} from 'terraso-mobile-client/model/permissions/permissions';
import {updateSoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  selectSoilData,
  selectUserRoleSite,
} from 'terraso-mobile-client/store/selectors';

type Props = {siteId: string};

export const SoilSurfaceScreen = ({siteId}: Props) => {
  const {t} = useTranslation();
  const site = useSelector(selectSite(siteId));
  const {surfaceCracksSelect: cracking} = useSelector(selectSoilData(siteId));
  const dispatch = useDispatch();
  const onUpdate = useCallback(
    (surfaceCracksSelect: SurfaceCracks | null) =>
      dispatch(updateSoilData({siteId, surfaceCracksSelect})),
    [dispatch, siteId],
  );

  const renderSurfaceCrack = useCallback(
    (value: SurfaceCracks) => t(`soil.vertical_cracking.value.${value}`),
    [t],
  );

  const userRole = useSelector(state => selectUserRoleSite(state, siteId));

  const isViewer = useMemo(() => isProjectViewer(userRole), [userRole]);

  return (
    <ScreenScaffold AppBar={<AppBar title={site.name} />}>
      <SiteRoleContextProvider siteId={siteId}>
        <Column padding="md">
          <Heading variant="h6">
            {t('soil.collection_method.verticalCracking')}
          </Heading>
          <Select
            disabled={isViewer}
            nullable
            value={cracking ?? null}
            onValueChange={onUpdate}
            options={surfaceCracks}
            renderValue={renderSurfaceCrack}
            label={t('soil.collection_method.verticalCracking')}
          />
          <Box height="lg" />

          <Paragraph>
            {t('soil.vertical_cracking.description', {units: 'METRIC'})}
          </Paragraph>
          <Box width="100%" alignItems="center">
            <Image
              source={require('terraso-mobile-client/assets/surface/vertical-cracking.png')}
            />
          </Box>
        </Column>
        <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
          <Box position="absolute" bottom="0" right="0">
            <DoneButton isDisabled={!cracking} />
          </Box>
        </RestrictBySiteRole>
      </SiteRoleContextProvider>
    </ScreenScaffold>
  );
};
