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

import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Modal,
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

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';

/**
 * Minimal iOS RAW (ProRAW) capture — "level 1" of the RAW color pipeline:
 * a plain full-screen camera preview + shutter, no ROI overlay and no
 * real-time analysis. It exists to prove the capture → `decodeRoi` path
 * end-to-end with the smallest possible surface. The full-featured camera
 * (ROI overlay + live analysis + the Android RAW path) is ported separately
 * from the research branch's RawCameraView.
 *
 * iOS-only for now (vision-camera + the ProRAW patch). Android RAW capture
 * goes through a different native module (raw-camera-android) and lands with
 * the full port.
 *
 * The capture mechanics (single-wide device selection for reliable RAW,
 * usePhotoOutput with stable options, capturePhoto → isRawPhoto →
 * saveToTemporaryFileAsync → extractDngPreviewJpeg, and the CaptureResult
 * factory below) are adapted from the research branch's RawCameraView.
 */

// Builds the `raw` CaptureResult. decodeRoi/renderPreview bridge straight to
// the dng-decoder Nitro module; the downstream ROI/decode pipeline doesn't
// care that this came from the minimal camera vs the full one.
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

type Props = {
  visible: boolean;
  // Receives the RAW CaptureResult; caller owns what to do with it (decode an
  // ROI, show the preview, etc.).
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
};

export const SimpleRawCamera = ({visible, onCapture, onCancel}: Props) => {
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
      const rawPath = await photo.saveToTemporaryFileAsync();
      const rawUri = rawPath.startsWith('file://')
        ? rawPath
        : `file://${rawPath}`;
      // iOS AVCapturePhoto DNGs embed a full-res Apple-processed JPEG preview;
      // pull it out as a companion. Best-effort — failure shouldn't block.
      let jpegPath: string | undefined;
      try {
        const p = DngDecoderHybrid.extractDngPreviewJpeg(rawUri);
        jpegPath = p.startsWith('file://') ? p : `file://${p}`;
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
      console.error('SimpleRawCamera: shutter failed:', err);
      onCancel();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, photoOutput, onCapture, onCancel]);

  const ready = !!device && hasPermission;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <StatusBar hidden />
      <View style={styles.fill}>
        {ready ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible}
            outputs={outputs}
            resizeMode="contain"
            enableNativeTapToFocusGesture={true}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Text style={styles.message}>
              {device
                ? 'Camera permission is required to capture.'
                : 'No compatible camera was found on this device.'}
            </Text>
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
            onPress={capture}
            disabled={!ready || isCapturing}
            accessibilityRole="button"
            style={[
              styles.shutter,
              (!ready || isCapturing) && styles.shutterDisabled,
            ]}
          />
          {/* Spacer to keep the shutter centered opposite the Cancel button. */}
          <View style={styles.cancelButton} />
        </SafeAreaView>
      </View>
    </Modal>
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
