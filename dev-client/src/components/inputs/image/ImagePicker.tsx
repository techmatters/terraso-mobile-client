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
  MediaTypeOptions,
  useCameraPermissions,
  useMediaLibraryPermissions,
} from 'expo-image-picker';
import {createAssetAsync} from 'expo-media-library';

import {Buffer} from '@craftzdog/react-native-buffer';
import {decode} from 'jpeg-js';
import {Button} from 'native-base';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {PermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {OverlaySheet} from 'terraso-mobile-client/components/sheets/OverlaySheet';

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

export const ImagePicker = ({
  onPick,
  children,
  featureName,
  ...modalProps
}: Props) => {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);

  const onUseCamera = useCallback(async () => {
    const response = await launchCameraAsync({
      mediaTypes: MediaTypeOptions.Images,
      cameraType: CameraType.back,
    });
    if (!response.canceled) {
      const asset = response.assets[0];
      createAssetAsync(asset.uri);
      onPick(response.assets[0]);
    }
    ref.current?.onClose();
  }, [onPick]);

  const onUseMediaLibrary = useCallback(async () => {
    const response = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
    });
    if (!response.canceled) {
      onPick(response.assets[0]);
    }
    ref.current?.onClose();
  }, [onPick]);

  const onCancel = useCallback(() => ref.current?.onClose(), []);

  return (
    <OverlaySheet ref={ref} trigger={children} Closer={null} {...modalProps}>
      <Column padding="lg" space="md">
        <PermissionsRequestWrapper
          requestModalTitle={t('permissions.camera_title')}
          requestModalBody={t('permissions.camera_body', {
            feature: featureName,
          })}
          permissionHook={useCameraPermissions}
          permissionedAction={onUseCamera}>
          {onRequestAction => (
            <Button
              _text={{textTransform: 'uppercase'}}
              onPress={onRequestAction}
              rightIcon={<Icon name="photo-camera" />}>
              {t('image.use_camera')}
            </Button>
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
            <Button
              _text={{textTransform: 'uppercase'}}
              onPress={onRequestAction}
              rightIcon={<Icon name="photo-library" />}>
              {t('image.choose_from_gallery')}
            </Button>
          )}
        </PermissionsRequestWrapper>
        <Button
          _text={{textTransform: 'uppercase'}}
          variant="outline"
          onPress={onCancel}>
          {t('general.cancel')}
        </Button>
      </Column>
    </OverlaySheet>
  );
};
