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
import {useTranslation} from 'react-i18next';
import {Modal, Pressable, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {theme} from 'terraso-mobile-client/theme';

type Props = {
  visible: boolean;
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
  /**
   * `'jpeg'` (default) mirrors the current expo-image-picker output.
   * `'dng'` is what phase 4 will request — the vision-camera patch in
   * phase 0 ensures this is plain Bayer even on ProRAW iPhones.
   * See docs/raw-camera-plan.md.
   */
  containerFormat?: 'jpeg' | 'dng';
  /**
   * Dev-only escape hatch. When set, RAW photos are handed off through
   * this callback (with the saved DNG file URI) instead of triggering the
   * phase-2 guard. Used by the fixture-capture menu item under
   * UserSettingsScreen to AirDrop DNGs off-device for the phase-3
   * decoder's test suite. Production camera flows leave this unset.
   */
  onRawPhotoDevOnly?: (uri: string) => void;
};

export const RawCameraView = ({
  visible,
  onCapture,
  onCancel,
  containerFormat = 'jpeg',
  onRawPhotoDevOnly,
}: Props) => {
  const {t} = useTranslation();
  // When capturing DNG on iOS, we must bind to a truly single-camera
  // device (isVirtualDevice=false) rather than any virtual multi-cam
  // aggregation. Apple only exposes plain Bayer RAW on single-camera
  // AVCaptureDevices; virtual devices (triple-camera, wide+LiDAR, etc.)
  // support only Apple ProRAW — a demosaiced LinearRaw DNG with tone map
  // and Deep Fusion baked in. `useCameraDevice(pos, {physicalDevices:
  // ['wide-angle']})` will happily match wide+LiDAR virtual devices too,
  // so we enumerate and hand-pick the wide-angle physical device.
  // See docs/raw-camera-plan.md phase 3.
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
  const device = containerFormat === 'dng' ? singleWideDevice : defaultDevice;
  const {hasPermission, requestPermission} = useCameraPermission();

  // TEMPORARY DIAGNOSTIC — remove once RAW capture is verified working.
  // Prints the selected device's identity so we can see whether the
  // physicalDevices filter took effect (single-cam wide-angle vs a
  // virtual multi-cam device).
  useEffect(() => {
    if (visible && device) {
      console.log(
        'RawCameraView device:',
        JSON.stringify(
          {
            id: device.id,
            name: device.name,
            position: device.position,
            type: device.type,
            isVirtualDevice: device.isVirtualDevice,
            physicalDeviceTypes: device.physicalDevices.map(d => d.type),
            containerFormat,
          },
          null,
          2,
        ),
      );
    }
  }, [visible, device, containerFormat]);

  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(err => {
        console.error('camera permission request failed:', err);
      });
    }
  }, [visible, hasPermission, requestPermission]);

  // usePhotoOutput must be called with stable options — vision-camera diffs
  // by identity to decide whether to reconfigure the capture session, and a
  // fresh object literal every render triggers reconfigure loops (which can
  // crash the native camera stack right after init).
  const photoOutputOptions = useMemo(
    () => ({
      targetResolution: {width: 4032, height: 3024},
      containerFormat,
    }),
    [containerFormat],
  );
  const photoOutput = usePhotoOutput(photoOutputOptions);
  // Same rationale for the outputs array passed to <Camera>.
  const outputs = useMemo(() => [photoOutput], [photoOutput]);

  // For DNG, push the constraint resolver toward a binned RAW-capable
  // format. Non-binned photo formats on the wide-angle sensor (full-res
  // 48 MP variants, high-FPS variants, HDR-required formats) commonly
  // omit RAW support even on single-camera devices — availableRaw-
  // PhotoPixelFormatTypes ends up empty. Binned formats reliably support
  // plain Bayer.
  const constraints = useMemo(
    () => (containerFormat === 'dng' ? [{binned: true}] : undefined),
    [containerFormat],
  );

  const cancel = useCallback(() => {
    setIsCapturing(false);
    onCancel();
  }, [onCancel]);

  const shutter = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await photoOutput.capturePhoto({}, {});

      if (photo.isRawPhoto) {
        if (onRawPhotoDevOnly) {
          const rawPath = await photo.saveToTemporaryFileAsync();
          onRawPhotoDevOnly(
            rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`,
          );
          return;
        }
        // Not wired up until phase 4. Guard so we don't silently produce a
        // JPEG-shaped result from a DNG file, which would corrupt the sRGB
        // pipeline downstream.
        console.error(
          'RawCameraView: RAW capture returned unexpectedly; RAW path is phase 4.',
        );
        cancel();
        return;
      }

      const filePath = await photo.saveToTemporaryFileAsync();
      // Match the existing Photo shape (uri, width, height) that the JPEG
      // pipeline already consumes. saveToTemporaryFileAsync returns a
      // filesystem path; expo-image-picker convention is a `file://` URL.
      onCapture({
        kind: 'jpeg',
        photo: {
          uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
          width: photo.width,
          height: photo.height,
        },
      });
    } catch (err) {
      console.error('RawCameraView shutter failed:', err);
      cancel();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, photoOutput, onCapture, cancel, onRawPhotoDevOnly]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={cancel}>
      <StatusBar hidden />
      <View style={styles.container}>
        {
          device && hasPermission ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              outputs={outputs}
              constraints={constraints}
              onSessionConfigSelected={config => {
                // TEMPORARY DIAGNOSTIC — remove with the device log above
                // once RAW capture works end-to-end.
                console.log(
                  'RawCameraView session config:',
                  JSON.stringify(config, null, 2),
                );
              }}
              // Tap anywhere on the viewfinder to refocus there.
              // Continuous autofocus is on by default; this lets the user
              // pick a specific point (soil patch or reference card) when
              // that matters.
              enableNativeTapToFocusGesture={true}
            />
          ) : !hasPermission ? (
            <View style={styles.messageContainer}>
              <Text color="white" variant="body1">
                {t('permissions.camera_title')}
              </Text>
            </View>
          ) : null /* device is enumerating — brief, keep the black backdrop */
        }

        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable
              onPress={cancel}
              accessibilityRole="button"
              accessibilityLabel={t('general.cancel')}
              hitSlop={12}
              style={styles.iconButton}>
              <Icon name="close" color="white" size="lg" />
            </Pressable>
          </View>
          <View style={styles.bottomBar}>
            <Pressable
              onPress={shutter}
              disabled={!device || !hasPermission || isCapturing}
              accessibilityRole="button"
              accessibilityLabel={t('soil.color.guide.take_photo')}
              style={({pressed}) => [
                styles.shutter,
                (pressed || isCapturing) && styles.shutterPressed,
              ]}>
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  messageContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  iconButton: {
    padding: 8,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterPressed: {
    borderColor: theme.colors.primary.main,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
});
