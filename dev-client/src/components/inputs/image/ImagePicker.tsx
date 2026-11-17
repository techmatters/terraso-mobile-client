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
import {Alert, Image, Platform} from 'react-native';

import {getDocumentAsync} from 'expo-document-picker';
import {Directory, File, Paths} from 'expo-file-system';
import {
  CameraType,
  launchCameraAsync,
  launchImageLibraryAsync,
  useCameraPermissions,
  useMediaLibraryPermissions,
} from 'expo-image-picker';

import {Buffer} from '@craftzdog/react-native-buffer';
import {DngDecoderHybrid} from 'dng-decoder';
import {decode} from 'jpeg-js';

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
  /**
   * Receives the picked image. `dngUri` is only populated when the user
   * selected a DNG via the "Choose File" button (and we were able to
   * extract a companion JPEG from it) — the caller can then stash the
   * DNG for later use (e.g. the Soil Images upload queue).
   */
  onPick: (result: Photo, dngUri?: string) => void;
  featureName: string;
  children: ModalTrigger;
  /**
   * When provided, "Use Camera" calls this instead of launchCameraAsync.
   * Lets a caller substitute a custom capture flow (e.g. our RAW-capable
   * preview camera, which doesn't go through expo-image-picker and
   * navigates onward itself). The sheet still closes after invocation.
   * Permission flow (PermissionsRequestWrapper) still runs — the override
   * is the `permissionedAction`, so camera permission is checked before
   * it fires. "Choose From Gallery" is unaffected.
   */
  onUseCameraOverride?: () => void;
};

// Managed location for files loaded via the "Choose File" button. Keeps
// the DNG (and its extracted sibling JPEG) in a spot we own, so the
// downstream pipeline doesn't depend on the document picker's temp cache
// (which the OS can reclaim or lock) and the Soil Images queue's eventual
// delete call reaches both files.
const loadedFilesDirName = 'soilColorLoaded';

// Promise wrapper for Image.getSize — the callback-flavoured API returns
// nothing. Resolves to the oriented dimensions (ie. what the image renders
// as, EXIF already applied).
const getImageSize = (uri: string): Promise<{width: number; height: number}> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({width, height}),
      err => reject(err),
    );
  });

const looksLikeDng = (name: string | undefined, mimeType: string | undefined) =>
  mimeType === 'image/x-adobe-dng' ||
  (name ?? '').toLowerCase().endsWith('.dng');

export const ImagePicker = ({
  onPick,
  children,
  featureName,
  onUseCameraOverride,
}: Props) => {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);

  const onUseCamera = useCallback(async () => {
    if (onUseCameraOverride) {
      // Close the sheet FIRST so the override's navigation doesn't fight the
      // sheet's own dismiss animation (which would leave the sheet mounted
      // behind the pushed screen on some platforms).
      ref.current?.onClose();
      onUseCameraOverride();
      return;
    }
    const response = await launchCameraAsync({
      mediaTypes: 'images',
      cameraType: CameraType.back,
    });
    if (!response.canceled) {
      onPick(response.assets[0]);
    }
    ref.current?.onClose();
  }, [onPick, onUseCameraOverride]);

  const onUseMediaLibrary = useCallback(async () => {
    const response = await launchImageLibraryAsync({
      mediaTypes: 'images',
    });
    if (!response.canceled) {
      onPick(response.assets[0]);
    }
    ref.current?.onClose();
  }, [onPick]);

  const onChooseFile = useCallback(async () => {
    const result = await getDocumentAsync({
      // The platform picker filters by these MIME types where it can. DNG
      // isn't a standard photo-library kind on either OS, which is why we
      // need the document picker at all (gallery can't surface DNG).
      type: ['image/x-adobe-dng', 'image/jpeg'],
      // Guarantees a stable file:// URI we can read directly.
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) {
      ref.current?.onClose();
      return;
    }
    const asset = result.assets[0];
    try {
      if (looksLikeDng(asset.name, asset.mimeType)) {
        if (Platform.OS !== 'ios') {
          // Android DNG support needs an extra PNG→JPEG step via
          // DngDecoderHybrid.renderPreview + manipulateAsync. Noted as a
          // follow-up; the native extractDngPreviewJpeg path is iOS-only.
          Alert.alert(
            t('image.file_picker.dng_unsupported_title'),
            t('image.file_picker.dng_unsupported_android'),
          );
          return;
        }
        // Copy the DNG into a dir we own so the extracted sibling JPEG lands
        // next to it in app cache (not the document picker's temp dir).
        const ownedDir = new Directory(Paths.cache, loadedFilesDirName);
        try {
          ownedDir.create({idempotent: true});
        } catch {
          // already exists / best effort
        }
        const dest = new File(
          ownedDir,
          asset.name || `loaded-${Date.now()}.dng`,
        );
        try {
          dest.delete();
        } catch {
          // ok if it didn't exist
        }
        await new File(asset.uri).copy(dest);
        // extractDngPreviewJpeg writes a sibling .jpg next to the DNG and
        // returns its path. Byte-copies Apple's embedded ISP-processed
        // preview — no decode, no re-encode, matches what a JPEG capture
        // would have looked like for the same shutter.
        const jpegPath = DngDecoderHybrid.extractDngPreviewJpeg(dest.uri);
        const jpegUri = jpegPath.startsWith('file://')
          ? jpegPath
          : `file://${jpegPath}`;
        const size = await getImageSize(jpegUri);
        onPick({uri: jpegUri, ...size}, dest.uri);
      } else {
        // Plain JPEG from the file picker.
        const size = await getImageSize(asset.uri);
        onPick({uri: asset.uri, ...size});
      }
    } catch (err) {
      console.warn('[ImagePicker] file load failed', err);
      Alert.alert(t('image.file_picker.load_failed_title'), String(err));
    } finally {
      ref.current?.onClose();
    }
  }, [onPick, t]);

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
        {/* Document picker sheet — no camera/library permission needed,
            the user selects via the OS file browser. Primary use case is
            loading a DNG that the gallery can't surface. JPEGs work too,
            as a convenience. iOS extracts the embedded preview JPEG from
            a DNG via DngDecoderHybrid; Android DNG is TODO (shows an
            alert). */}
        <ContainedButton
          label={t('image.choose_file')}
          size="lg"
          stretchToFit={true}
          onPress={onChooseFile}
          leftIcon="folder-open"
        />
      </Column>
    </StandaloneOverlaySheet>
  );
};
