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
import {Alert, Image} from 'react-native';

import {getDocumentAsync} from 'expo-document-picker';
import {Directory, File, Paths} from 'expo-file-system';
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator';
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
  // Sheet trigger (required unless `inline`). In inline mode the three source
  // buttons render directly with no sheet.
  children?: ModalTrigger;
  // Render the camera/gallery/file buttons directly (no trigger, no sheet).
  inline?: boolean;
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

// Max width/height for the DNG display preview rendered at pick time. The crop
// UI resizes to ≤200px anyway, and analysis reads the full-res raw sensor data
// (not this preview), so this only needs to be large enough to crop against
// comfortably.
const DNG_PREVIEW_MAX_DIM = 2048;

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

// JPEG needs no conversion — it's what the color pipeline decodes natively.
const looksLikeJpeg = (
  name: string | undefined,
  mimeType: string | undefined,
) => mimeType === 'image/jpeg' || /\.jpe?g$/.test((name ?? '').toLowerCase());

// MIME types offered to the OS document picker. DNG and JPEG feed analysis
// directly (DNG via the raw decoder, JPEG via jpeg-js); HEIC/HEIF and PNG are
// decoded to JPEG first (see onChooseFile) because jpeg-js can't read them.
// expo-document-picker maps these to UTIs on iOS. Other image formats (TIFF,
// WebP, vendor RAW, …) are intentionally excluded for now.
const ACCEPTED_FILE_TYPES = [
  'image/x-adobe-dng',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
];

export const ImagePicker = ({
  onPick,
  children,
  featureName,
  onUseCameraOverride,
  inline = false,
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
      type: ACCEPTED_FILE_TYPES,
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
        // Copy the DNG into a dir we own so it stays put for both the analysis
        // decode here and the later Soil Images upload (not the document
        // picker's temp dir, which the OS can reclaim).
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
        // Render a DISPLAY preview from the raw data (both platforms; the raw
        // decoder's own colour pipeline, not an ISP-cooked embedded JPEG). The
        // analysis later reads the raw sensor pixels straight from `dest` — this
        // preview is only for the crop UI. If the native decoder can't read the
        // DNG (e.g. Android compressed/tiled strips, or a corrupt file), fail
        // hard rather than falling back to a lower-fidelity source.
        let preview;
        try {
          preview = await DngDecoderHybrid.renderPreview(
            dest.uri,
            DNG_PREVIEW_MAX_DIM,
          );
        } catch (dngErr) {
          console.warn('[ImagePicker] DNG decode failed', dngErr);
          try {
            dest.delete();
          } catch {
            // best effort
          }
          Alert.alert(
            t('image.file_picker.dng_decode_failed_title'),
            t('image.file_picker.dng_decode_failed_body'),
          );
          return;
        }
        // renderPreview yields a PNG; normalise to JPEG so the display photo
        // (and the upload queue's image/jpeg content-type) stay JPEG.
        const jpeg = await manipulateAsync(preview.uri, [], {
          format: SaveFormat.JPEG,
          compress: 1.0,
        });
        const size = await getImageSize(jpeg.uri);
        onPick({uri: jpeg.uri, ...size}, dest.uri);
      } else if (looksLikeJpeg(asset.name, asset.mimeType)) {
        // Plain JPEG from the file picker — the color pipeline decodes it
        // directly, no conversion needed.
        const size = await getImageSize(asset.uri);
        onPick({uri: asset.uri, ...size});
      } else {
        // HEIC/HEIF or PNG: jpeg-js can't decode these, so normalise to JPEG
        // via the platform image decoders (manipulateAsync). This is a
        // display/analysis convenience only — these formats carry no raw
        // sensor data, so a JPEG re-encode loses nothing the analysis uses.
        // Decode can fail where the OS lacks a codec (notably HEIF on older
        // Android); treat that as an unsupported-format failure rather than a
        // silent degrade.
        let jpeg;
        try {
          jpeg = await manipulateAsync(asset.uri, [], {
            format: SaveFormat.JPEG,
            compress: 1.0,
          });
        } catch (convertErr) {
          console.warn('[ImagePicker] image decode/convert failed', convertErr);
          Alert.alert(
            t('image.file_picker.unsupported_format_title'),
            t('image.file_picker.unsupported_format_body'),
          );
          return;
        }
        const size = await getImageSize(jpeg.uri);
        onPick({uri: jpeg.uri, ...size});
      }
    } catch (err) {
      console.warn('[ImagePicker] file load failed', err);
      Alert.alert(t('image.file_picker.load_failed_title'), String(err));
    } finally {
      ref.current?.onClose();
    }
  }, [onPick, t]);

  const choices = (
    <Column padding={inline ? undefined : 'lg'} space="md">
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
            loading a DNG that the gallery can't surface. JPEG, HEIC/HEIF and
            PNG work too (HEIC/PNG are normalised to JPEG on load). DNGs are
            decoded via DngDecoderHybrid on both platforms (raw sensor pixels
            drive analysis); an undecodable DNG fails with an alert. */}
      <ContainedButton
        label={t('image.choose_file')}
        size="lg"
        stretchToFit={true}
        onPress={onChooseFile}
        leftIcon="folder-open"
      />
    </Column>
  );

  if (inline) {
    return choices;
  }
  return (
    <StandaloneOverlaySheet trigger={children} ref={ref}>
      {choices}
    </StandaloneOverlaySheet>
  );
};
