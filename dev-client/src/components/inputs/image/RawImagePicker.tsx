/*
 * Copyright © 2026 Technology Matters
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

import {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {
  launchImageLibraryAsync,
  useMediaLibraryPermissions,
} from 'expo-image-picker';
import {createAssetAsync} from 'expo-media-library';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawCameraView} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {PermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {StandaloneOverlaySheet} from 'terraso-mobile-client/components/sheets/StandaloneOverlaySheet';

type Props = {
  onPick: (result: CaptureResult) => void;
  featureName: string;
  children: ModalTrigger;
};

/**
 * Sibling of {@link ImagePicker} that routes the "Use camera" branch through
 * the in-app {@link RawCameraView} (built on react-native-vision-camera)
 * instead of the OS camera intent. Camera output is currently JPEG; the RAW
 * capture path lands in phase 4. See docs/raw-camera-plan.md.
 *
 * The "Choose from gallery" branch continues to use expo-image-picker
 * unchanged.
 */
export const RawImagePicker = ({onPick, children, featureName}: Props) => {
  const {t} = useTranslation();
  const sheetRef = useRef<ModalHandle>(null);
  const [cameraVisible, setCameraVisible] = useState(false);

  const onUseCamera = useCallback(() => {
    // Close the picker sheet first so the camera modal takes the whole screen.
    sheetRef.current?.onClose();
    setCameraVisible(true);
  }, []);

  const onCameraCapture = useCallback(
    (result: CaptureResult) => {
      setCameraVisible(false);
      if (result.kind === 'jpeg') {
        // Persist the JPEG to the device media library so it behaves like a
        // photo the user took — matches the existing ImagePicker behavior.
        createAssetAsync(result.photo.uri).catch(err => {
          console.warn('createAssetAsync failed:', err);
        });
      }
      onPick(result);
    },
    [onPick],
  );

  const onCameraCancel = useCallback(() => {
    setCameraVisible(false);
  }, []);

  const onUseMediaLibrary = useCallback(async () => {
    const response = await launchImageLibraryAsync({mediaTypes: 'images'});
    if (!response.canceled) {
      onPick({kind: 'jpeg', photo: response.assets[0]});
    }
    sheetRef.current?.onClose();
  }, [onPick]);

  return (
    <>
      <StandaloneOverlaySheet trigger={children} ref={sheetRef}>
        <Column padding="lg" space="md">
          {/*
            Camera permission is requested inside RawCameraView (via
            vision-camera's own Camera.requestCameraPermission), so the outer
            PermissionsRequestWrapper the JPEG ImagePicker uses is unnecessary
            here — the button just opens the camera.
          */}
          <ContainedButton
            label={t('image.use_camera')}
            size="lg"
            stretchToFit={true}
            onPress={onUseCamera}
            leftIcon="photo-camera"
          />
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
      <RawCameraView
        visible={cameraVisible}
        onCapture={onCameraCapture}
        onCancel={onCameraCancel}
      />
    </>
  );
};
