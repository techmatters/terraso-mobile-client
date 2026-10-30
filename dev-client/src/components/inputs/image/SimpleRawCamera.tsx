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
  useMemo,
  useRef,
  useState,
} from 'react';
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

import {deleteAsync} from 'expo-file-system/legacy';

import {DngDecoderHybrid} from 'dng-decoder';
import {RawCameraAndroidHybrid, RawCameraAndroidView} from 'raw-camera-android';

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RoiOverlay} from 'terraso-mobile-client/components/inputs/image/RoiOverlay';
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
  useRoiFrameAnalyzer,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

/**
 * In-app RAW capture: live preview + shutter, a two-ROI overlay, and real-time
 * per-ROI analysis, backed by the dng-decoder pipeline. A minimal, clean
 * alternative to the research RawCameraView (no CameraChrome / chart-guide
 * baggage).
 *
 * Renders *inline* and fills its container — it does NOT present itself (no
 * Modal/Portal). Host it in something that gives it the full screen (e.g. a
 * navigation screen).
 *
 * Two platform implementations behind one component:
 *   - iOS: vision-camera + the ProRAW patch. A vision-camera frame output
 *     drives both the live preview AND the ROI analyzer; because that output
 *     forces a non-RAW format, it is detached around each capture (the
 *     onConfigured dance below). The ROI overlay is the JS RoiOverlay.
 *   - Android: the raw-camera-android Nitro module (vision-camera can't save
 *     RAW_SENSOR on Android); it owns its own native preview + overlay. The
 *     native overlay is still disabled here pending the Android overlay wiring.
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
    // Delete the temp DNG + companion JPEG. These live in a cache dir the
    // OS would eventually reclaim, but the auto-test loop captures hundreds
    // of ~24 MB DNGs in a session, so we free each one as soon as the
    // caller is done with it. Fire-and-forget + idempotent so a missing
    // file (already swept, never written) is a no-op, not a throw.
    deleteAsync(dngPath, {idempotent: true}).catch(() => {});
    if (jpegPath) {
      deleteAsync(jpegPath, {idempotent: true}).catch(() => {});
    }
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
  // Dev stress-test hook (Android only). When provided, the chrome shows an
  // "Auto" toggle; once the preview is live it captures repeatedly and feeds
  // each result (or null on a failed/timed-out shot) to onShot instead of
  // onCapture, until stopped. onShot returns a one-line status to display and
  // is responsible for disposing the result (so temp files don't pile up).
  onShot?: (
    result: CaptureResult | null,
    index: number,
  ) => Promise<string> | string;
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

// iPhone rear sensor is 4:3 landscape; the DNG rotates to 3:4 portrait for
// display. Width / height.
const SENSOR_ASPECT = 3 / 4;

// Fixed-aspect wrapper, centered and letterboxed inside its parent. Everything
// inside shares one coordinate system: whatever fills this box fills the same
// area as the captured sensor image (with the camera at resizeMode="contain").
// That's what makes the ROI overlay line up with the preview (and map 1:1 to
// the DNG) instead of being positioned against the full, wider-than-sensor
// screen. Adapted from the research RawCameraView's SensorAspectFrame.
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
    inner =
      container.w / container.h >= aspect
        ? {height: container.h, width: container.h * aspect}
        : {width: container.w, height: container.w / aspect};
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

  // Real-time ROI analyzer. Its vision-camera frame output ALSO drives the
  // iOS live preview — a photo-output-only session renders no viewfinder.
  // Fixed ROIs for now (no preset UI).
  const {frameOutput, refQuality, sampleQuality} = useRoiFrameAnalyzer(
    DISPLAY_REF_ROI,
    DISPLAY_SAMPLE_ROI,
  );

  // A frame output forces the session onto a non-RAW-capable format, so detach
  // it around each capture: flip `detachedForCapture` → session reconfigures to
  // a RAW-capable format (awaited via onConfigured) → shoot → reattach. Mirrors
  // the research IosDngCameraLayer.
  const [detachedForCapture, setDetachedForCapture] = useState(false);
  const outputs = useMemo(
    () => (detachedForCapture ? [photoOutput] : [photoOutput, frameOutput]),
    [detachedForCapture, photoOutput, frameOutput],
  );
  const configResolveRef = useRef<(() => void) | null>(null);
  const onConfigured = useCallback(() => {
    const resolve = configResolveRef.current;
    if (resolve) {
      configResolveRef.current = null;
      resolve();
    }
  }, []);

  const capture = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      // Detach the frame output and wait for the session to reconfigure to a
      // RAW-capable format before shooting.
      const reconfigured = new Promise<void>(resolve => {
        configResolveRef.current = resolve;
      });
      setDetachedForCapture(true);
      await reconfigured;

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
      // Reattach the frame output (live preview + analysis resume).
      setDetachedForCapture(false);
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
          <SensorAspectFrame aspect={SENSOR_ASPECT}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={visible}
              outputs={outputs}
              onConfigured={onConfigured}
              // Tie orientation to the (portrait-locked) UI, not the physical
              // device, so the preview stays fixed to the screen and doesn't
              // reorient when the phone is rotated.
              orientationSource="interface"
              resizeMode="contain"
              enableNativeTapToFocusGesture={true}
            />
            <RoiOverlay
              refRoi={DISPLAY_REF_ROI}
              sampleRoi={DISPLAY_SAMPLE_ROI}
              refQuality={refQuality}
              sampleQuality={sampleQuality}
            />
          </SensorAspectFrame>
        ) : null
      }
    />
  );
};

// ---------------------------------------------------------------------------
// Android: raw-camera-android Nitro module (CameraX + DngCreator). The native
// view owns the preview + CameraX session; capture is imperative via the
// module-level hybrid object. The native ROI overlay is disabled for now.
//
// KNOWN BLOCKER (Pixel 6a / Android 16): no RAW stream combo streams the
// preview — the 3-stream fallbacks bind but stay IDLE and capture times out.
// Needs native CameraSessionManager work (verify-streaming ladder / force
// 2-stream preview+raw). See docs/raw-capture-integration-plan.md
// "2.1c-ANDROID-BLOCKER". iOS is unaffected.

const AndroidRawCapture = ({visible, onCapture, onCancel, onShot}: Props) => {
  // vision-camera's permission hook requests the OS CAMERA permission, which
  // is what raw-camera-android needs too — reuse it rather than a second path.
  const {hasPermission, requestPermission} = useCameraPermission();
  const [isCapturing, setIsCapturing] = useState(false);
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

  useEffect(() => {
    if (visible && !hasPermission) {
      requestPermission().catch(err => {
        console.error('SimpleRawCamera: permission request failed:', err);
      });
    }
  }, [visible, hasPermission, requestPermission]);

  // Kick the CameraX session into a proper bind once the native view is up.
  // getCaptureCapabilities() runs ensureBound() native-side so the session is
  // warm before the first shutter press. Mirrors the research RawColorTools
  // flows (one retry covers the attach race). Harmless if already bound.
  useEffect(() => {
    if (!visible || !hasPermission) return;
    let cancelled = false;
    const attempt = async (retryLeft: number): Promise<void> => {
      try {
        await RawCameraAndroidHybrid.getCaptureCapabilities();
      } catch (err) {
        if (retryLeft > 0 && !cancelled) {
          await new Promise<void>(r => setTimeout(r, 300));
          if (!cancelled) return attempt(retryLeft - 1);
        }
        if (!cancelled) {
          console.warn('SimpleRawCamera: capability probe failed', err);
        }
      }
    };
    attempt(2);
    return () => {
      cancelled = true;
    };
  }, [visible, hasPermission]);

  // One RAW capture. Returns the result, or null if the shot failed/timed
  // out. Does NOT call onCapture/onCancel — callers decide (manual shutter
  // navigates on a result; the auto loop just tallies and keeps going).
  const captureOnce = useCallback(async (): Promise<CaptureResult | null> => {
    try {
      // skipJpeg: we only need the RAW DNG here, and skipping the JPEG halves
      // the native pipeline stages on the critical path.
      const photo = await RawCameraAndroidHybrid.capturePhoto({skipJpeg: true});
      return makeRawCaptureResult(
        fileUri(photo.dngPath),
        photo.width,
        photo.height,
        photo.jpegPath ? fileUri(photo.jpegPath) : undefined,
      );
    } catch (err) {
      console.error('SimpleRawCamera: Android capture failed:', err);
      return null;
    }
  }, []);

  const manualShutter = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const result = await captureOnce();
      if (result) {
        onCapture(result);
      } else {
        onCancel();
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, captureOnce, onCapture, onCancel]);

  // --- Dev auto-test loop: capture → onShot → repeat until stopped. ---
  const autoRunningRef = useRef(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [shotCount, setShotCount] = useState(0);
  const [lastStatus, setLastStatus] = useState('');

  const stopAuto = useCallback(() => {
    autoRunningRef.current = false;
    setAutoRunning(false);
  }, []);

  const startAuto = useCallback(() => {
    if (!onShot || autoRunningRef.current) return;
    autoRunningRef.current = true;
    setAutoRunning(true);
    setShotCount(0);
    setLastStatus('starting…');
    (async () => {
      let i = 0;
      while (autoRunningRef.current) {
        setIsCapturing(true);
        const result = await captureOnce();
        let status: string;
        try {
          status = await onShot(result, i);
        } catch (e) {
          status = `onShot error: ${String(e)}`;
        }
        setIsCapturing(false);
        i += 1;
        setShotCount(i);
        setLastStatus(status);
        if (!autoRunningRef.current) break;
        // Small gap so the preview keeps streaming between shots and the UI
        // can repaint the running tally.
        await new Promise<void>(r => setTimeout(r, 400));
      }
    })().catch(() => {});
  }, [onShot, captureOnce]);

  // Stop the loop if the screen goes away mid-run (back / nav / blur).
  useEffect(() => {
    if (!visible) {
      autoRunningRef.current = false;
      setAutoRunning(false);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  // CameraX is picky about its RN host. The research module's own screen
  // documents that the native view must live inside a ScreenScaffold + AppBar
  // with a plain flex:1 container — deviating (a bare full-screen View, a
  // hidden StatusBar, or nesting the view in a fixed-size wrapper) silently
  // leaves CameraX bound-but-never-streaming, so takePicture times out. That
  // is exactly the Pixel 6a symptom we hit with the shared CaptureChrome, so
  // Android gets this bespoke host instead of CaptureChrome. The native view
  // stays flat/absoluteFill; shutter + cancel float over it.
  const shutterDisabled =
    !hasPermission || isCapturing || !armed || autoRunning;
  const cancel = () => {
    stopAuto();
    onCancel();
  };
  return (
    <ScreenScaffold AppBar={<AppBar title="RAW capture" />}>
      <View style={styles.androidContainer}>
        {hasPermission ? (
          <RawCameraAndroidView
            style={StyleSheet.absoluteFill}
            showRoiOverlay={false}
            // preferJpeg: drop the ImageAnalysis stream (we don't use Android
            // live analysis here) in favour of JPEG on the 3-stream fallback.
            preferJpeg={true}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Text style={styles.message}>
              Camera permission is required to capture.
            </Text>
          </View>
        )}
        {autoRunning && (
          <SafeAreaView style={styles.statusBanner} edges={['top']}>
            <Text style={styles.statusText}>Auto-test · shot {shotCount}</Text>
            <Text style={styles.statusText} numberOfLines={2}>
              {lastStatus}
            </Text>
          </SafeAreaView>
        )}
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Pressable
            onPress={cancel}
            style={styles.cancelButton}
            accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={manualShutter}
            disabled={shutterDisabled}
            accessibilityRole="button"
            style={[styles.shutter, shutterDisabled && styles.shutterDisabled]}
          />
          {onShot ? (
            <Pressable
              onPress={autoRunning ? stopAuto : startAuto}
              disabled={!hasPermission || !armed}
              accessibilityRole="button"
              style={[
                styles.autoButton,
                autoRunning && styles.autoButtonActive,
                !hasPermission || !armed ? styles.shutterDisabled : null,
              ]}>
              <Text style={styles.autoButtonText}>
                {autoRunning ? 'Stop' : 'Auto'}
              </Text>
            </Pressable>
          ) : (
            // Spacer to keep the shutter centered opposite Cancel.
            <View style={styles.cancelButton} />
          )}
        </SafeAreaView>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'black'},
  // Plain flex:1 container for the Android native view — see the note on the
  // Android render path. Must NOT be a fixed-size wrapper.
  androidContainer: {flex: 1, backgroundColor: 'black'},
  // Fills the preview area and centers the sensor-aspect box (letterboxed).
  sensorFrameOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  autoButton: {
    width: 80,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  autoButtonActive: {backgroundColor: 'rgba(220,40,40,0.85)'},
  autoButtonText: {color: 'white', fontSize: 16, fontWeight: '600'},
  // Running auto-test tally pinned just under the AppBar.
  statusBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  statusText: {color: 'white', fontSize: 14},
});
