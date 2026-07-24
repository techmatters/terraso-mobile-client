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
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawPickImageButton} from 'terraso-mobile-client/components/inputs/image/RawPickImageButton';
import {
  Box,
  Column,
  Paragraph,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

export const CameraWorkflow = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onPickImage = useCallback(
    (result: CaptureResult) => {
      // Phase 2: only the JPEG branch is ever populated. The RAW branch is
      // wired up in phase 4 (see docs/raw-camera-plan.md); guarding here
      // means a future partial rollout doesn't silently corrupt the sRGB
      // pipeline downstream.
      if (result.kind !== 'jpeg') return;
      navigation.navigate('COLOR_ANALYSIS', {
        photo: result.photo,
        pitProps: props,
      });
    },
    [navigation, props],
  );

  const onUseGuide = useCallback(
    () => navigation.navigate('COLOR_GUIDE', props),
    [props, navigation],
  );

  return (
    <SiteRoleContextProvider siteId={props.siteId}>
      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <Column>
          <Box alignItems="center" paddingVertical="lg">
            <RawPickImageButton
              featureName={t('soil.color.featureName')}
              onPick={onPickImage}
            />
          </Box>
          <Column
            backgroundColor="grey.300"
            paddingHorizontal="md"
            paddingVertical="lg"
            alignItems="flex-start">
            <Paragraph>{t('soil.color.photo_need_help')}</Paragraph>
            <ContainedButton
              onPress={onUseGuide}
              rightIcon="chevron-right"
              label={t('soil.color.use_guide_label')}
            />
          </Column>
        </Column>
      </RestrictBySiteRole>
    </SiteRoleContextProvider>
  );
};
