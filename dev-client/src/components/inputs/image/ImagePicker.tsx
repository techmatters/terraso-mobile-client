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

import {useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {
  CameraType,
  launchCameraAsync,
  launchImageLibraryAsync,
  useCameraPermissions,
  useMediaLibraryPermissions,
} from 'expo-image-picker';
import {createAssetAsync} from 'expo-media-library';

import {Buffer} from '@craftzdog/react-native-buffer';
import {decode} from 'jpeg-js';
import {usePostHog} from 'posthog-react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {PermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {StandaloneOverlaySheet} from 'terraso-mobile-client/components/sheets/StandaloneOverlaySheet';

export type Photo = {
  width: number;
  height: number;
  uri: string;
};

export type PhotoWithBase64 = {
  width: number;
  height: number;
  uri: string;
  base64: string;
};

export const decodeBase64Jpg = (base64: string) =>
  decode(Buffer.from(base64, 'base64'), {useTArray: true});

type Props = {
  onPick: (result: Photo) => void;
  featureName: string;
  children: ModalTrigger;
};

export const ImagePicker = ({onPick, children, featureName}: Props) => {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);
  const posthog = usePostHog();

  const onUseCamera = useCallback(async () => {
    console.log('[ImagePicker] onUseCamera called');
    posthog?.capture('image_picker_camera_button_pressed', {
      feature: featureName,
      timestamp: new Date().toISOString(),
    });

    try {
      console.log('[ImagePicker] Calling launchCameraAsync...');
      const response = await launchCameraAsync({
        mediaTypes: 'images',
        cameraType: CameraType.back,
      });

      console.log('[ImagePicker] Camera response:', {
        canceled: response.canceled,
        hasAssets: (response.assets?.length ?? 0) > 0,
      });

      posthog?.capture('image_picker_camera_response', {
        feature: featureName,
        canceled: response.canceled,
        timestamp: new Date().toISOString(),
      });

      if (!response.canceled) {
        const asset = response.assets[0];
        createAssetAsync(asset.uri);
        onPick(response.assets[0]);
      }
    } catch (error) {
      console.error('[ImagePicker] Camera error:', error);
      posthog?.capture('image_picker_camera_error', {
        feature: featureName,
        error: String(error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      ref.current?.onClose();
    }
  }, [onPick, featureName, posthog]);

  const onUseMediaLibrary = useCallback(async () => {
    console.log('[ImagePicker] onUseMediaLibrary called');
    posthog?.capture('image_picker_gallery_button_pressed', {
      feature: featureName,
      timestamp: new Date().toISOString(),
    });

    try {
      console.log('[ImagePicker] Calling launchImageLibraryAsync...');
      const response = await launchImageLibraryAsync({
        mediaTypes: 'images',
      });

      console.log('[ImagePicker] Gallery response:', {
        canceled: response.canceled,
        hasAssets: (response.assets?.length ?? 0) > 0,
      });

      posthog?.capture('image_picker_gallery_response', {
        feature: featureName,
        canceled: response.canceled,
        timestamp: new Date().toISOString(),
      });

      if (!response.canceled) {
        onPick(response.assets[0]);
      }
    } catch (error) {
      console.error('[ImagePicker] Gallery error:', error);
      posthog?.capture('image_picker_gallery_error', {
        feature: featureName,
        error: String(error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      ref.current?.onClose();
    }
  }, [onPick, featureName, posthog]);

  return (
    <StandaloneOverlaySheet trigger={children} ref={ref}>
      <Column padding="lg" space="md">
        <PermissionsRequestWrapper
          requestModalTitle={t('permissions.camera_title')}
          requestModalBody={t('permissions.camera_body', {
            feature: featureName,
          })}
          permissionHook={useCameraPermissions}
          permissionedAction={onUseCamera}>
          {onRequestAction => (
            <ContainedButton
              label={t('image.use_camera')}
              size="lg"
              stretchToFit={true}
              onPress={onRequestAction}
              leftIcon="photo-camera"
            />
          )}
        </PermissionsRequestWrapper>
        <PermissionsRequestWrapper
          requestModalTitle={t('permissions.gallery_title')}
          requestModalBody={t('permissions.gallery_body', {
            feature: featureName,
          })}
          permissionHook={useMediaLibraryPermissions}
          permissionedAction={onUseMediaLibrary}>
          {onRequestAction => (
            <ContainedButton
              label={t('image.choose_from_gallery')}
              size="lg"
              stretchToFit={true}
              onPress={onRequestAction}
              leftIcon="photo-library"
            />
          )}
        </PermissionsRequestWrapper>
      </Column>
    </StandaloneOverlaySheet>
  );
};
