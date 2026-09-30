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

import * as DocumentPicker from 'expo-document-picker';
import {
  launchImageLibraryAsync,
  useMediaLibraryPermissions,
} from 'expo-image-picker';
import {createAssetAsync} from 'expo-media-library';

import {DngDecoderHybrid} from 'dng-decoder';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  CaptureResult,
  ContainerFormat,
  isDngContainer,
} from 'terraso-mobile-client/components/inputs/image/captureTypes';
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
  /** Threaded through to {@link RawCameraView}. Default `'jpeg'`. */
  containerFormat?: ContainerFormat;
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
export const RawImagePicker = ({
  onPick,
  children,
  featureName,
  containerFormat,
}: Props) => {
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
    if (isDngContainer(containerFormat)) {
      // RAW modes: pick a .dng from Files, not a JPEG from the photo
      // gallery. The photo library strips RAW originals on the way in
      // (iOS auto-converts + Android's MediaStore likewise) so gallery
      // → RAW is intrinsically broken. Route the picked DNG through
      // the same handoff camera-captured DNGs use (kind: 'raw' with
      // decodeRoi + renderPreview closures), so downstream nav lands
      // on the experimental analysis screen instead of the
      // production-JPEG COLOR_ANALYSIS route.
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      sheetRef.current?.onClose();
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset || !asset.name.toLowerCase().endsWith('.dng')) {
        console.warn(
          'RawImagePicker: gallery pick in RAW mode expects .dng, got',
          asset?.name,
        );
        return;
      }
      const dngPath = asset.uri.startsWith('file://')
        ? asset.uri
        : `file://${asset.uri}`;
      // Sensor dims come from the DNG's own metadata — parsed once
      // from the TIFF headers (cheap, no pixel decode). The
      // downstream analysis screen uses these to scale preview-space
      // ROIs back up to sensor coords before decodeDngRois.
      const meta = DngDecoderHybrid.readMetadata(dngPath);
      onPick({
        kind: 'raw',
        dngPath,
        jpegPath: undefined,
        width: meta.width,
        height: meta.height,
        decodeRoi: async roi => {
          const [rgb] = await DngDecoderHybrid.decodeDngRois(dngPath, [roi]);
          return rgb;
        },
        renderPreview: async maxDim => {
          const p = await DngDecoderHybrid.renderPreview(dngPath, maxDim);
          return {uri: p.uri, width: p.width, height: p.height};
        },
        dispose: () => {},
      });
      return;
    }
    // JPEG mode: photo gallery like the production path.
    const response = await launchImageLibraryAsync({mediaTypes: 'images'});
    if (!response.canceled) {
      onPick({kind: 'jpeg', photo: response.assets[0]});
    }
    sheetRef.current?.onClose();
  }, [onPick, containerFormat]);

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
        containerFormat={containerFormat}
        // Soil-color capture-mode inference: 'dng' = "raw + jpeg"
        // (user wants JPEG companion), 'dng-live' = "raw + evenness"
        // (user wants live variance analyser). Chart/calibrate flows
        // use RawCameraView directly and set preferJpeg explicitly;
        // this only applies to the RawImagePicker (soil-color) path.
        preferJpeg={containerFormat === 'dng'}
      />
    </>
  );
};
