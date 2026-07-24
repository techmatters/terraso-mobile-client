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

import {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Modal, Pressable, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
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
};

export const RawCameraView = ({
  visible,
  onCapture,
  onCancel,
  containerFormat = 'jpeg',
}: Props) => {
  const {t} = useTranslation();
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(err => {
        console.error('camera permission request failed:', err);
      });
    }
  }, [visible, hasPermission, requestPermission]);

  const photoOutput = usePhotoOutput({
    targetResolution: {width: 4032, height: 3024},
    containerFormat,
  });

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
  }, [isCapturing, photoOutput, onCapture, cancel]);

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
              outputs={[photoOutput]}
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
