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
import {useTranslation} from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
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

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {setAndroidRawCaptureCallbacks} from 'terraso-mobile-client/components/inputs/image/androidRawCaptureRequest';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {theme} from 'terraso-mobile-client/theme';

type Props = {
  visible: boolean;
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
  /**
   * `'jpeg'` (default) mirrors the current expo-image-picker output.
   * `'dng'` captures RAW: on iOS via vision-camera + our ProRAW patch,
   * on Android via the raw-camera-android Nitro module (bypassing
   * vision-camera whose Android side can't save RAW_SENSOR photos yet
   * — see docs/raw-camera-plan.md phase 7).
   */
  containerFormat?: 'jpeg' | 'dng';
  /**
   * Dev-only escape hatch. When set, RAW photos are handed off through
   * this callback (with the saved DNG file URI) instead of the normal
   * CaptureResult. Used by the fixture-capture menu item under
   * UserSettingsScreen to AirDrop DNGs off-device. Production camera
   * flows leave this unset. Not honored on the Android RAW path (the
   * `raw-camera-android` module is what would have to know about it).
   */
  onRawPhotoDevOnly?: (uri: string) => void;
};

// Top-level router. Android + DNG uses the raw-camera-android Nitro
// module directly (bypassing vision-camera's broken saveToFile for
// RAW_SENSOR); everything else uses vision-camera. iOS RAW still goes
// through vision-camera because AVCapturePhoto.fileDataRepresentation()
// handles DNG file writing natively over there.
export const RawCameraView = (props: Props) => {
  const useAndroidRaw =
    Platform.OS === 'android' && props.containerFormat === 'dng';
  return useAndroidRaw ? (
    <AndroidRawViewImpl {...props} />
  ) : (
    <VisionCameraViewImpl {...props} />
  );
};

// ---------------------------------------------------------------------------
// Vision-camera path — iOS RAW (ProRAW) + all JPEG. Same code that shipped
// pre-phase-7 for both platforms; unchanged except for extraction into
// a private component.

const VisionCameraViewImpl = ({
  visible,
  onCapture,
  onCancel,
  containerFormat = 'jpeg',
  onRawPhotoDevOnly,
}: Props) => {
  // For DNG capture on iOS, bind to a truly single-camera device
  // (isVirtualDevice=false) rather than a virtual multi-cam aggregation.
  // Virtual devices (built-in triple-camera, wide+LiDAR, dual-wide) have
  // spottier RAW support than pure single-cam physical devices. Bayer RAW
  // is truly single-cam-only per Apple's WWDC21 talk; ProRAW works on
  // both but is more reliable on single-cam.
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
  const device =
    containerFormat === 'dng' && Platform.OS === 'ios'
      ? singleWideDevice
      : defaultDevice;
  const {hasPermission, requestPermission} = useCameraPermission();

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
        const rawPath = await photo.saveToTemporaryFileAsync();
        const rawUri = rawPath.startsWith('file://')
          ? rawPath
          : `file://${rawPath}`;
        if (onRawPhotoDevOnly) {
          onRawPhotoDevOnly(rawUri);
          return;
        }
        if (containerFormat === 'dng') {
          onCapture(makeRawCaptureResult(rawUri, photo.width, photo.height));
          return;
        }
        // We got a RAW photo but the caller didn't ask for one. Refuse to
        // silently emit a JPEG-shaped result from DNG data — that would
        // corrupt the downstream sRGB pipeline.
        console.error(
          'RawCameraView: RAW capture returned unexpectedly for containerFormat=%s',
          containerFormat,
        );
        cancel();
        return;
      }

      const filePath = await photo.saveToTemporaryFileAsync();
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
  }, [
    isCapturing,
    photoOutput,
    onCapture,
    cancel,
    onRawPhotoDevOnly,
    containerFormat,
  ]);

  const preview =
    device && hasPermission ? (
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={visible}
        outputs={outputs}
        // Tap anywhere on the viewfinder to refocus there.
        // Continuous autofocus is on by default; this lets the user
        // pick a specific point (soil patch or reference card) when
        // that matters.
        enableNativeTapToFocusGesture={true}
      />
    ) : null;

  return (
    <CameraChrome
      visible={visible}
      cancel={cancel}
      shutter={shutter}
      shutterDisabled={!device || !hasPermission || isCapturing}
      isCapturing={isCapturing}
      hasPermission={hasPermission}>
      {preview}
    </CameraChrome>
  );
};

// ---------------------------------------------------------------------------
// Android RAW path — new for phase 7. Delegates the camera UI to a
// full-screen React Navigation route (AndroidRawCaptureScreen) that
// owns the CameraX pipeline via raw-camera-android. This wrapper
// component renders nothing on-screen; it just navigates when the
// `visible` prop flips true. Callbacks are threaded through a
// module-scope bridge (androidRawCaptureRequest) because RN nav params
// need to be JSON-serializable.
//
// Rationale for a nav screen vs. an inline overlay: CameraX doesn't
// play with RN Modal (Dialog window) or with an absolute overlay
// trapped inside a bottom-sheet parent (parent bounds constrain the
// preview surface, camera pipeline stalls). A dedicated screen route
// gives us a full-screen primary-Window container which is the only
// env the CameraX pipeline is happy in.

const AndroidRawViewImpl = ({
  visible,
  onCapture,
  onCancel,
  onRawPhotoDevOnly,
}: Props) => {
  const navigation = useNavigation();
  const {hasPermission, requestPermission} = useCameraPermission();

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(err => {
        console.error('camera permission request failed:', err);
      });
    }
  }, [visible, hasPermission, requestPermission]);

  // On visible flipping true, stash callbacks + navigate. Cancel path
  // just calls onCancel (parent controls `visible`, so it'll set it
  // back to false on its own).
  useEffect(() => {
    if (!visible) return;
    if (!hasPermission) return;
    setAndroidRawCaptureCallbacks({
      onCapture: result => {
        if (result.kind === 'raw' && onRawPhotoDevOnly) {
          onRawPhotoDevOnly(result.dngPath);
          return;
        }
        onCapture(result);
      },
      onCancel,
    });
    navigation.navigate('ANDROID_RAW_CAPTURE');
    // Only trigger on the visible→true transition. Re-firing on
    // callback identity changes would re-navigate and re-open the
    // screen mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, hasPermission]);

  return null;
};

// ---------------------------------------------------------------------------
// Shared modal chrome: cancel button, shutter button, no-permission
// fallback, black backdrop. Doesn't care what preview surface goes in
// the children slot.

const CameraChrome = ({
  visible,
  cancel,
  shutter,
  shutterDisabled,
  isCapturing,
  hasPermission,
  children,
}: {
  visible: boolean;
  cancel: () => void;
  shutter: () => void;
  shutterDisabled: boolean;
  isCapturing: boolean;
  hasPermission: boolean;
  children: ReactNode;
}) => {
  const {t} = useTranslation();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={cancel}>
      <StatusBar hidden />
      <View style={styles.container}>
        {children}
        {!hasPermission && (
          <View style={styles.messageContainer}>
            <Text color="white" variant="body1">
              {t('permissions.camera_title')}
            </Text>
          </View>
        )}
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
              disabled={shutterDisabled}
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

// ---------------------------------------------------------------------------
// Shared CaptureResult factory. Both platforms end up here — the
// downstream ROI-picker + decode pipeline doesn't care where the DNG
// came from.

const makeRawCaptureResult = (
  dngPath: string,
  width: number,
  height: number,
): CaptureResult => ({
  kind: 'raw',
  dngPath,
  width,
  height,
  decodeRoi: async roi => {
    const [rgb] = await DngDecoderHybrid.decodeDngRois(dngPath, [roi]);
    return rgb;
  },
  renderPreview: async maxDim => {
    const preview = await DngDecoderHybrid.renderPreview(dngPath, maxDim);
    return {
      uri: preview.uri,
      width: preview.width,
      height: preview.height,
    };
  },
  dispose: () => {
    // TODO: unlink the temp file. Both saveToTemporaryFileAsync (iOS)
    // and File.createTempFile in cacheDir (Android) stash in a location
    // the OS may reclaim on its own. Leaving for the OS to sweep for
    // now — worth revisiting if we start holding many captures.
  },
});

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
