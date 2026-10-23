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

import {ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import {DngDecoderHybrid} from 'dng-decoder';
import {RawCameraAndroidHybrid, RawCameraAndroidView} from 'raw-camera-android';

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';

/**
 * Minimal RAW capture — "level 1" of the RAW color pipeline: a plain camera
 * preview + shutter, no ROI overlay and no real-time analysis. It proves the
 * capture → `decodeRoi` path end-to-end with the smallest possible surface, on
 * both platforms. The full-featured camera (ROI overlay + live analysis) is
 * ported separately from the research branch's RawCameraView.
 *
 * This renders *inline* and fills its container — it does NOT present itself
 * (no Modal/Portal). Host it in something that gives it the full screen (e.g.
 * a navigation screen). Presenting an in-tree overlay caused the opening tap's
 * touch to leak into the shutter (auto-capture); a dedicated screen avoids that.
 *
 * Two platform implementations behind one component:
 *   - iOS: vision-camera + the ProRAW patch (usePhotoOutput / capturePhoto).
 *   - Android: the raw-camera-android Nitro module (vision-camera can't save
 *     RAW_SENSOR on Android); its native overlay is disabled for level 1.
 */

// Builds the `raw` CaptureResult. decodeRoi/renderPreview bridge straight to
// the dng-decoder Nitro module (C++ on Android, CIRAWFilter on iOS); the
// downstream ROI/decode pipeline doesn't care which camera produced the DNG.
const makeRawCaptureResult = (
  dngPath: string,
  width: number,
  height: number,
  jpegPath?: string,
): CaptureResult => ({
  kind: 'raw',
  dngPath,
  jpegPath,
  width,
  height,
  decodeRoi: async roi => {
    const [rgb] = await DngDecoderHybrid.decodeDngRois(dngPath, [roi]);
    return rgb;
  },
  renderPreview: async maxDim => {
    const preview = await DngDecoderHybrid.renderPreview(dngPath, maxDim);
    return {uri: preview.uri, width: preview.width, height: preview.height};
  },
  dispose: () => {
    // Temp DNG/JPEG live in a cache dir the OS may reclaim; leave the sweep
    // to the OS for now (matches the research behavior). Revisit once the
    // managed capture store (slice 2.3) owns retention.
  },
});

const fileUri = (p: string): string =>
  p.startsWith('file://') ? p : `file://${p}`;

type Props = {
  visible: boolean;
  // Receives the RAW CaptureResult; caller owns what to do with it (decode an
  // ROI, show the preview, etc.).
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
};

export const SimpleRawCamera = (props: Props) =>
  Platform.OS === 'android' ? (
    <AndroidRawCapture {...props} />
  ) : (
    <IosRawCapture {...props} />
  );

// ---------------------------------------------------------------------------
// Shared presentation: fills the container with the live preview and a shutter
// / cancel control row. The platform impls supply the `preview` node and the
// shutter handler.

type ChromeProps = {
  visible: boolean;
  preview: ReactNode;
  unavailableMessage: string;
  canCapture: boolean;
  isCapturing: boolean;
  onShutter: () => void;
  onCancel: () => void;
};

const CaptureChrome = ({
  visible,
  preview,
  unavailableMessage,
  canCapture,
  isCapturing,
  onShutter,
  onCancel,
}: ChromeProps) => {
  // Arm the shutter a beat after becoming visible — cheap insurance against a
  // stray press landing the instant the camera appears.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!visible) {
      setArmed(false);
      return;
    }
    const timer = setTimeout(() => setArmed(true), 400);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }
  const shutterDisabled = !canCapture || isCapturing || !armed;
  return (
    <View style={styles.fill}>
      <StatusBar hidden />
      {preview ?? (
        <View style={[styles.fill, styles.center]}>
          <Text style={styles.message}>{unavailableMessage}</Text>
        </View>
      )}
      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <Pressable
          onPress={onCancel}
          style={styles.cancelButton}
          accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onShutter}
          disabled={shutterDisabled}
          accessibilityRole="button"
          style={[styles.shutter, shutterDisabled && styles.shutterDisabled]}
        />
        {/* Spacer to keep the shutter centered opposite the Cancel button. */}
        <View style={styles.cancelButton} />
      </SafeAreaView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// iOS: vision-camera + ProRAW patch.

const IosRawCapture = ({visible, onCapture, onCancel}: Props) => {
  // Bind to a true single-camera wide device (not a virtual multi-cam
  // aggregation) — Apple's RAW support is more reliable on single-cam
  // physical devices. Fall back to the default back camera if none found.
  const defaultDevice = useCameraDevice('back');
  const allDevices = useCameraDevices();
  const singleWideDevice = useMemo(
    () =>
      allDevices.find(
        d =>
          d.position === 'back' &&
          d.type === 'wide-angle' &&
          !d.isVirtualDevice,
      ),
    [allDevices],
  );
  const device = singleWideDevice ?? defaultDevice;

  const {hasPermission, requestPermission} = useCameraPermission();
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(err => {
        console.error('SimpleRawCamera: permission request failed:', err);
      });
    }
  }, [visible, hasPermission, requestPermission]);

  // usePhotoOutput must receive stable options — vision-camera diffs by
  // identity to decide whether to reconfigure the session; a fresh object
  // each render triggers reconfigure loops that can crash the native stack.
  const photoOutputOptions = useMemo(
    () => ({
      targetResolution: {width: 4032, height: 3024},
      containerFormat: 'dng' as const,
    }),
    [],
  );
  const photoOutput = usePhotoOutput(photoOutputOptions);
  const outputs = useMemo(() => [photoOutput], [photoOutput]);

  const capture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await photoOutput.capturePhoto({}, {});
      if (!photo.isRawPhoto) {
        // Asked for DNG but got a processed photo — refuse to emit a
        // JPEG-shaped result from RAW data; that would corrupt the pipeline.
        console.error('SimpleRawCamera: expected a RAW photo but got JPEG');
        onCancel();
        return;
      }
      const rawUri = fileUri(await photo.saveToTemporaryFileAsync());
      // iOS AVCapturePhoto DNGs embed a full-res Apple-processed JPEG preview;
      // pull it out as a companion. Best-effort — failure shouldn't block.
      let jpegPath: string | undefined;
      try {
        jpegPath = fileUri(DngDecoderHybrid.extractDngPreviewJpeg(rawUri));
      } catch (err) {
        console.warn(
          'SimpleRawCamera: preview-JPEG extraction failed; continuing without companion JPEG',
          err,
        );
      }
      onCapture(
        makeRawCaptureResult(rawUri, photo.width, photo.height, jpegPath),
      );
    } catch (err) {
      console.error('SimpleRawCamera: iOS shutter failed:', err);
      onCancel();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, photoOutput, onCapture, onCancel]);

  const ready = !!device && hasPermission;

  return (
    <CaptureChrome
      visible={visible}
      canCapture={ready}
      isCapturing={isCapturing}
      onShutter={capture}
      onCancel={onCancel}
      unavailableMessage={
        device
          ? 'Camera permission is required to capture.'
          : 'No compatible camera was found on this device.'
      }
      preview={
        ready ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible}
            outputs={outputs}
            resizeMode="contain"
            enableNativeTapToFocusGesture={true}
          />
        ) : null
      }
    />
  );
};

// ---------------------------------------------------------------------------
// Android: raw-camera-android Nitro module (CameraX + DngCreator). The native
// view owns the preview + CameraX session; capture is imperative via the
// module-level hybrid object. The native ROI overlay is disabled for level 1.

const AndroidRawCapture = ({visible, onCapture, onCancel}: Props) => {
  // vision-camera's permission hook requests the OS CAMERA permission, which
  // is what raw-camera-android needs too — reuse it rather than a second path.
  const {hasPermission, requestPermission} = useCameraPermission();
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(err => {
        console.error('SimpleRawCamera: permission request failed:', err);
      });
    }
  }, [visible, hasPermission, requestPermission]);

  const capture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await RawCameraAndroidHybrid.capturePhoto({});
      onCapture(
        makeRawCaptureResult(
          fileUri(photo.dngPath),
          photo.width,
          photo.height,
          photo.jpegPath ? fileUri(photo.jpegPath) : undefined,
        ),
      );
    } catch (err) {
      console.error('SimpleRawCamera: Android shutter failed:', err);
      onCancel();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture, onCancel]);

  return (
    <CaptureChrome
      visible={visible}
      canCapture={hasPermission}
      isCapturing={isCapturing}
      onShutter={capture}
      onCancel={onCancel}
      unavailableMessage="Camera permission is required to capture."
      preview={
        hasPermission && visible ? (
          <RawCameraAndroidView
            style={StyleSheet.absoluteFill}
            showRoiOverlay={false}
          />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'black'},
  center: {alignItems: 'center', justifyContent: 'center', padding: 24},
  message: {color: 'white', fontSize: 16, textAlign: 'center'},
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  cancelButton: {width: 80},
  cancelText: {color: 'white', fontSize: 16},
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterDisabled: {opacity: 0.4},
});
