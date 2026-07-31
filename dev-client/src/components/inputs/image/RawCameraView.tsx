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

import {
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import type {CameraDevice, CameraPhotoOutput} from 'react-native-vision-camera';

import {activateKeepAwakeAsync, deactivateKeepAwake} from 'expo-keep-awake';

import {DngDecoderHybrid} from 'dng-decoder';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {setAndroidRawCaptureCallbacks} from 'terraso-mobile-client/components/inputs/image/androidRawCaptureRequest';
import {
  CaptureResult,
  ContainerFormat,
  isDngContainer,
} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RoiOverlay} from 'terraso-mobile-client/components/inputs/image/RoiOverlay';
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
  useRoiFrameAnalyzer,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {theme} from 'terraso-mobile-client/theme';

type Props = {
  visible: boolean;
  onCapture: (result: CaptureResult) => void;
  onCancel: () => void;
  /**
   * `'jpeg'` (default) mirrors the current expo-image-picker output.
   * `'dng'` and `'dng-live'` both capture RAW: on iOS via vision-camera
   * + our ProRAW patch, on Android via the raw-camera-android Nitro
   * module (bypassing vision-camera whose Android side can't save
   * RAW_SENSOR photos yet — see docs/raw-camera-plan.md phase 7).
   * `'dng-live'` additionally mounts the phase-8 real-time ROI analyzer
   * overlay on top of the preview. On Android (phase 8.2) the overlay
   * is currently always-on regardless of which of the two DNG modes
   * you pick — the JS-tunable suppression is a follow-up (task #78).
   */
  containerFormat?: ContainerFormat;
  /**
   * Dev-only escape hatch. When set, RAW photos are handed off through
   * this callback (with the saved DNG file URI) instead of the normal
   * CaptureResult. Used by the fixture-capture menu item under
   * UserSettingsScreen to AirDrop DNGs off-device. Production camera
   * flows leave this unset. Not honored on the Android RAW path (the
   * `raw-camera-android` module is what would have to know about it).
   */
  onRawPhotoDevOnly?: (uri: string) => void;
  /**
   * When set, overlay a centered {aspectW × aspectH}-ratio framing
   * rectangle on the viewfinder as a shooting guide. Used by the
   * Munsell chart validator flow so the tester frames the chart
   * consistently — a known chart size in the capture lets
   * downstream registration tighten its size/skew tolerances. Pass
   * something like `{aspectW: 4.5, aspectH: 7, marginFrac: 0.25}`
   * for the 10YR chart on 8.5×11 paper.
   */
  chartGuide?: {
    aspectW: number;
    aspectH: number;
    marginFrac: number;
  };
};

// Top-level router. Android + DNG uses the raw-camera-android Nitro
// module directly (bypassing vision-camera's broken saveToFile for
// RAW_SENSOR); everything else uses vision-camera. iOS RAW still goes
// through vision-camera because AVCapturePhoto.fileDataRepresentation()
// handles DNG file writing natively over there.
export const RawCameraView = (props: Props) => {
  const useAndroidRaw =
    Platform.OS === 'android' && isDngContainer(props.containerFormat);
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
  chartGuide,
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
    isDngContainer(containerFormat) && Platform.OS === 'ios'
      ? singleWideDevice
      : defaultDevice;
  const {hasPermission, requestPermission} = useCameraPermission();

  // EV compensation for capture. iPhone ProRAW bakes Apple's ISP tone
  // curve into the pixel data — bright cells get highlight-compressed
  // toward neutral (very visible on high-value Munsell chart chips
  // like 10YR 8/8). Under-exposing the whole capture keeps the sensor
  // in the linear-ish middle of that curve where Apple's compression
  // hasn't kicked in yet. Cycles 0 → -1 → -2 → 0 on tap so a tester
  // can pick the least-clipped setting without leaving the camera.
  const [exposureEv, setExposureEv] = useState<number>(0);
  const cycleExposureEv = useCallback(() => {
    setExposureEv(v => (v === 0 ? -1 : v === -1 ? -2 : 0));
  }, []);

  const [isCapturing, setIsCapturing] = useState(false);
  // Set by IosDngCameraLayer when it mounts (dng-live only). Used by
  // shutter to bracket photoOutput.capturePhoto() with a detach/reattach
  // of the frame output — see IosDngCameraLayer's `prepareForCapture`.
  const iosDngLayerRef = useRef<IosDngCameraLayerHandle | null>(null);

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
  // vision-camera only knows 'jpeg' / 'dng' / 'heic' / 'native' — collapse
  // our 'dng-live' virtual mode down to 'dng' for the capture pipeline.
  // The `-live` suffix only affects whether we mount the overlay layer
  // below; the DNG shot itself is identical.
  const nativeContainerFormat: 'jpeg' | 'dng' = isDngContainer(containerFormat)
    ? 'dng'
    : 'jpeg';
  const photoOutputOptions = useMemo(
    () => ({
      targetResolution: {width: 4032, height: 3024},
      containerFormat: nativeContainerFormat,
    }),
    [nativeContainerFormat],
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
      // In 'dng-live' mode, the frame output has to come off the session
      // before RAW capture can run — otherwise AVCapturePhotoOutput has
      // no RAW pixel formats available. IosDngCameraLayer handles the
      // detach + wait-for-reconfigure via its ref; we reattach in
      // `finally` so the overlay resumes even if capture threw.
      const dngLayer = iosDngLayerRef.current;
      if (dngLayer) await dngLayer.prepareForCapture();
      let photo;
      try {
        photo = await photoOutput.capturePhoto({}, {});
      } finally {
        dngLayer?.finishCapture();
      }

      if (photo.isRawPhoto) {
        const rawPath = await photo.saveToTemporaryFileAsync();
        const rawUri = rawPath.startsWith('file://')
          ? rawPath
          : `file://${rawPath}`;
        if (onRawPhotoDevOnly) {
          onRawPhotoDevOnly(rawUri);
          return;
        }
        if (isDngContainer(containerFormat)) {
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

  // Mount the phase-8.4 real-time analyzer + overlay only when the caller
  // explicitly opted in via 'dng-live'. The sub-component owns
  // useFrameOutput so the hook (which requires vision-camera-worklets)
  // never runs on Android, in JPEG mode, or in plain 'dng' mode — three
  // places where it'd either fail (worklets provider absent on Android)
  // or waste cycles for no visible benefit.
  const useIosPhase8Overlay =
    Platform.OS === 'ios' && containerFormat === 'dng-live';
  const preview =
    device && hasPermission ? (
      useIosPhase8Overlay ? (
        <IosDngCameraLayer
          ref={iosDngLayerRef}
          device={device}
          isActive={visible}
          photoOutput={photoOutput}
          exposure={exposureEv}
        />
      ) : (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={visible}
          outputs={outputs}
          exposure={exposureEv}
          // Show the FULL sensor image letterboxed instead of
          // cropping-to-fill. Makes the viewfinder WYSIWYG relative to
          // the captured DNG — a guide overlay positioned inside the
          // camera bounds corresponds 1:1 to a position in the DNG,
          // which matters for the chart validator's framing.
          resizeMode="contain"
          // Tap anywhere on the viewfinder to refocus there.
          // Continuous autofocus is on by default; this lets the user
          // pick a specific point (soil patch or reference card) when
          // that matters.
          enableNativeTapToFocusGesture={true}
        />
      )
    ) : null;

  return (
    <CameraChrome
      visible={visible}
      cancel={cancel}
      shutter={shutter}
      shutterDisabled={!device || !hasPermission || isCapturing}
      isCapturing={isCapturing}
      hasPermission={hasPermission}
      exposureEv={exposureEv}
      onCycleExposure={cycleExposureEv}
      chartGuide={chartGuide}>
      {preview}
    </CameraChrome>
  );
};

// ---------------------------------------------------------------------------
// iOS-only DNG camera layer with the phase-8.4 real-time analyzer +
// overlay. Isolated here so useFrameOutput (which internally requires
// react-native-vision-camera-worklets) is only ever invoked on iOS
// DNG captures — never on Android and never in JPEG mode.

// The parent shutter uses this to bracket a photoOutput.capturePhoto()
// call: on iOS, adding a vision-camera frame output forces the session
// to pick a non-RAW-capable AVCaptureDeviceFormat, so we have to
// detach the frame output, wait for the session to reconfigure, run
// the capture, then reattach. Called only when in 'dng-live' mode.
export type IosDngCameraLayerHandle = {
  prepareForCapture: () => Promise<void>;
  finishCapture: () => void;
};

// The vision-camera constraint API doesn't have an "any Format that
// supports RAW capture" knob (see CameraPhotoOutput.nitro.ts TODO).
// resolutionBias helps but on iPhone rear cams it still isn't enough
// to guarantee the RAW-capable Format is picked when a frame output
// is present. So instead of biasing, we detach the frame output around
// each capture — see `prepareForCapture` below.
const IosDngCameraLayer = ({
  ref,
  device,
  isActive,
  photoOutput,
  exposure,
}: {
  ref?: React.Ref<IosDngCameraLayerHandle>;
  device: CameraDevice;
  isActive: boolean;
  photoOutput: CameraPhotoOutput;
  exposure: number;
}) => {
  const {frameOutput, refQuality, sampleQuality} = useRoiFrameAnalyzer();
  // Toggled by prepareForCapture/finishCapture. When true, the outputs
  // list drops frameOutput → session reconfigures to a RAW-capable
  // Format → capture works → we flip back.
  const [detachedForCapture, setDetachedForCapture] = useState(false);
  const outputs = useMemo(
    () => (detachedForCapture ? [photoOutput] : [photoOutput, frameOutput]),
    [detachedForCapture, photoOutput, frameOutput],
  );

  // Resolver for the next-onConfigured promise. `prepareForCapture`
  // sets this, then flips `detachedForCapture` → session reconfigures →
  // onConfigured fires → resolve the pending promise. Cleared after
  // each resolve so subsequent onConfigureds (e.g. the reattach one)
  // are no-ops.
  const configResolveRef = useRef<(() => void) | null>(null);
  const onConfigured = useCallback(() => {
    const resolve = configResolveRef.current;
    if (resolve) {
      configResolveRef.current = null;
      resolve();
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      prepareForCapture: () => {
        const pending = new Promise<void>(resolve => {
          configResolveRef.current = resolve;
        });
        setDetachedForCapture(true);
        return pending;
      },
      finishCapture: () => {
        setDetachedForCapture(false);
      },
    }),
    [],
  );

  return (
    <>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={outputs}
        onConfigured={onConfigured}
        exposure={exposure}
        resizeMode="contain"
        enableNativeTapToFocusGesture={true}
      />
      <RoiOverlay
        refRoi={DISPLAY_REF_ROI}
        sampleRoi={DISPLAY_SAMPLE_ROI}
        refQuality={refQuality}
        sampleQuality={sampleQuality}
      />
    </>
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

// Tag for expo-keep-awake — namespacing lets the wake-lock coexist
// cleanly with any other keep-awake callers elsewhere in the app.
const KEEP_AWAKE_TAG = 'RawCameraView';

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
  exposureEv,
  onCycleExposure,
  chartGuide,
  children,
}: {
  visible: boolean;
  cancel: () => void;
  shutter: () => void;
  shutterDisabled: boolean;
  isCapturing: boolean;
  hasPermission: boolean;
  exposureEv: number;
  onCycleExposure: () => void;
  chartGuide?: {aspectW: number; aspectH: number; marginFrac: number};
  children: ReactNode;
}) => {
  const {t} = useTranslation();
  // Keep the screen awake while the modal is visible so the phase-8
  // overlay remains usable — users spend real seconds framing a card
  // against a soil sample and iOS's default idle-dim (~30s) hits at
  // exactly the wrong moment. Imperative activate/deactivate lets us
  // tie the wake-lock to `visible` instead of just component-mount.
  useEffect(() => {
    if (!visible) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(err => {
      console.warn('activateKeepAwakeAsync failed:', err);
    });
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [visible]);
  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={cancel}>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Sensor-aspect frame that both the letterboxed camera preview
           and the chart guide overlay share, so any guide-rect position
           on screen corresponds 1:1 to a position in the captured DNG.
           Aspect is hard-coded to the iPhone rear cam's 3:4 portrait
           (sensor is 4:3 landscape, DNG orientation rotates it). If we
           add cameras with a different native aspect, thread that in
           as a prop. */}
        <SensorAspectFrame aspect={SENSOR_ASPECT}>
          {children}
          {chartGuide && <ChartGuideOverlay guide={chartGuide} />}
        </SensorAspectFrame>
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
            <Pressable
              onPress={onCycleExposure}
              accessibilityRole="button"
              accessibilityLabel="cycle exposure compensation"
              hitSlop={12}
              style={styles.evButton}>
              <Text color="white" variant="body1" bold>
                {`EV ${exposureEv > 0 ? '+' : ''}${exposureEv}`}
              </Text>
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

// iPhone rear camera sensor is 4:3 landscape; DNG orientation
// rotates it to 3:4 portrait for display and CV. If we ever add
// support for cameras with a different native aspect (unlikely for
// this app in the near term), thread the aspect through as a prop.
const SENSOR_ASPECT = 3 / 4; // width / height, portrait

// Fixed-aspect wrapper centered inside its parent, letterboxed with
// black bars on the axis that doesn't bind. Everything inside sees
// the same coordinate system: whatever fills this view fills the
// same area as the captured sensor image (assuming the camera is
// rendered with resizeMode="contain"). That's what lets a screen-
// space overlay (like the chart guide) map 1:1 to a DNG-space
// region. Uses onLayout instead of aspectRatio-style so behaviour
// is predictable across RN versions.
const SensorAspectFrame = ({
  aspect,
  children,
}: {
  aspect: number;
  children: ReactNode;
}) => {
  const [container, setContainer] = useState<{w: number; h: number} | null>(
    null,
  );
  let inner: {width: number; height: number} | null = null;
  if (container) {
    // Fit `aspect` (w/h) inside the container. Whichever dimension
    // is the binding one wins; the other gets letterboxed.
    if (container.w / container.h >= aspect) {
      inner = {height: container.h, width: container.h * aspect};
    } else {
      inner = {width: container.w, height: container.w / aspect};
    }
  }
  return (
    <View
      style={styles.sensorFrameOuter}
      onLayout={e =>
        setContainer({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }>
      {inner && <View style={inner}>{children}</View>}
    </View>
  );
};

// Centered aspectW×aspectH framing rectangle used as a shooting
// guide when the caller opts in via the `chartGuide` prop. Fits
// inside the SensorAspectFrame with `marginFrac` breathing room on
// the tighter dimension (so the guide's shorter axis leaves that
// fraction of the frame as margin; the other axis gets whatever's
// left). pointerEvents: 'none' so it never intercepts touches — the
// shutter and tap-to-focus still work through it.
const ChartGuideOverlay = ({
  guide,
}: {
  guide: {aspectW: number; aspectH: number; marginFrac: number};
}) => {
  const [layout, setLayout] = useState<{w: number; h: number} | null>(null);
  const {aspectW, aspectH, marginFrac} = guide;
  let rectStyle: {width: number; height: number} | null = null;
  if (layout) {
    const {w, h} = layout;
    // Fit the aspect box inside the viewfinder with `marginFrac`
    // margin — pick whichever dimension is binding.
    const maxW = w * (1 - 2 * marginFrac);
    const maxH = h * (1 - 2 * marginFrac);
    const boxW = Math.min(maxW, (maxH * aspectW) / aspectH);
    const boxH = (boxW * aspectH) / aspectW;
    rectStyle = {width: boxW, height: boxH};
  }
  return (
    <View
      style={styles.guideContainer}
      pointerEvents="none"
      onLayout={e =>
        setLayout({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }>
      {rectStyle && <View style={[styles.guideRect, rectStyle]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  sensorFrameOuter: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideRect: {
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 2,
    borderRadius: 6,
  },
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
    alignItems: 'center',
    gap: 12,
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
  evButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
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
