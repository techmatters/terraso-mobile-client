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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {selectDepthDependentData} from 'terraso-client-shared/selectors';
import {updateDepthDependentSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {fromEntries} from 'terraso-client-shared/utils';

import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const PhotoConditions = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();

  const soilOptions = useMemo(
    () =>
      fromEntries(
        (['MOIST', 'DRY'] as const).map(condition => [
          condition,
          {
            text: t(`soil.color.color_photo_soil_condition.${condition}`),
          },
        ]),
      ),
    [t],
  );

  const lightingOptions = useMemo(
    () =>
      fromEntries(
        (['EVEN', 'UNEVEN'] as const).map(condition => [
          condition,
          {
            text: t(`soil.color.color_photo_lighting_condition.${condition}`),
          },
        ]),
      ),
    [t],
  );

  const data = useSelector(selectDepthDependentData(props));
  const dispatch = useDispatch();

  const soilGroupProps = useMemo(
    () =>
      ({
        name: 'SOIL',
        value: data.colorPhotoSoilCondition ?? undefined,
        onChange: (colorPhotoSoilCondition: 'DRY' | 'MOIST') =>
          dispatch(
            updateDepthDependentSoilData({
              siteId: props.siteId,
              depthInterval: props.depthInterval.depthInterval,
              colorPhotoSoilCondition,
            }),
          ),
        variant: 'oneLine',
      }) as const,
    [data.colorPhotoSoilCondition, dispatch, props],
  );

  const lightingGroupProps = useMemo(
    () =>
      ({
        name: 'LIGHTING',
        value: data.colorPhotoLightingCondition ?? undefined,
        onChange: (colorPhotoLightingCondition: 'EVEN' | 'UNEVEN') =>
          dispatch(
            updateDepthDependentSoilData({
              siteId: props.siteId,
              depthInterval: props.depthInterval.depthInterval,
              colorPhotoLightingCondition,
            }),
          ),
        variant: 'oneLine',
      }) as const,
    [data.colorPhotoLightingCondition, dispatch, props],
  );

  return (
    <SiteRoleContextProvider siteId={props.siteId}>
      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <Column paddingHorizontal="md">
          <RadioBlock
            label={t('soil.color.soil_condition')}
            options={soilOptions}
            groupProps={soilGroupProps}
          />
          <RadioBlock
            label={t('soil.color.lighting_condition')}
            options={lightingOptions}
            groupProps={lightingGroupProps}
          />
        </Column>
      </RestrictBySiteRole>
    </SiteRoleContextProvider>
  );
};
