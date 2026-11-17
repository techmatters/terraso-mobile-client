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
import {Photo} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {PickImageButton} from 'terraso-mobile-client/components/inputs/image/PickImageButton';
import {
  Box,
  Column,
  Paragraph,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {
  useUseNewPreviewUx,
  useUseRawWhenAvailable,
} from 'terraso-mobile-client/model/rawColor/colorCameraPrefs';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

export const CameraWorkflow = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const useNewPreview = useUseNewPreviewUx();
  const useRaw = useUseRawWhenAvailable();

  // UX routing:
  //   new-UX ON  → full-screen live-preview camera (PREVIEW_CAPTURE mode:
  //                'auto'), no sheet, auto-crops via ROIs.
  //   new-UX OFF → classic PickImageButton (+-in-square), opens the "Use
  //                Camera / Choose From Gallery" sheet. "Use Camera" uses
  //                our RAW-capable preview capture (mode: 'crop') when
  //                useRawWhenAvailable is ON — so a DNG lands alongside
  //                the JPEG; otherwise it falls back to expo-image-picker
  //                (JPEG only). "Choose From Gallery" is always legacy.

  const onPickImage = useCallback(
    (photo: Photo) => {
      navigation.navigate('COLOR_ANALYSIS', {
        photo: photo,
        pitProps: props,
      });
    },
    [navigation, props],
  );

  const onUseNewPreviewCamera = useCallback(
    () =>
      navigation.navigate('PREVIEW_CAPTURE', {
        pitProps: props,
        mode: 'auto',
      }),
    [navigation, props],
  );

  // RAW override for the classic sheet's "Use Camera" button: swap
  // launchCameraAsync (JPEG only) for our preview capture so the user
  // keeps the familiar sheet UX but the shutter produces RAW+JPEG where
  // possible. mode='crop' means after shutter the user still does the
  // manual tap-to-crop — matches the legacy flow visually.
  const onUseCameraOverride = useRaw
    ? () =>
        navigation.navigate('PREVIEW_CAPTURE', {
          pitProps: props,
          mode: 'crop',
        })
    : undefined;

  const onUseGuide = useCallback(
    () => navigation.navigate('COLOR_GUIDE', props),
    [props, navigation],
  );

  return (
    <SiteRoleContextProvider siteId={props.siteId}>
      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <Column>
          <Box alignItems="center" paddingVertical="lg">
            {useNewPreview ? (
              <ContainedButton
                onPress={onUseNewPreviewCamera}
                leftIcon="photo-camera"
                label={t('soil.color.take_photo_live')}
              />
            ) : (
              <PickImageButton
                featureName={t('soil.color.featureName')}
                onPick={onPickImage}
                onUseCameraOverride={onUseCameraOverride}
              />
            )}
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
