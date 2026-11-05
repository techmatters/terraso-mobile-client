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
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {runOnJS, useSharedValue} from 'react-native-reanimated';
import {
  Camera,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
  useFrameOutput,
  usePhotoOutput,
} from 'react-native-vision-camera';

import {File} from 'expo-file-system';
import {deleteAsync} from 'expo-file-system/legacy';

import {DngDecoderHybrid} from 'dng-decoder';
import {FrameAnalyzerHybrid} from 'frame-analyzer';
import {
  createRoiAnalyzer as createNativeRoiAnalyzer,
  RawCameraAndroidHybrid,
  RawCameraAndroidView,
  type FrameAnalyzer as NativeFrameAnalyzer,
} from 'raw-camera-android';

import type {
  Capture,
  FrameAnalyzer,
  LinearRgb,
  RawColorCameraHandle,
  RawColorCameraProps,
  Roi,
  RoiAnalyzerConfig,
  RoiStats,
  SaveOptions,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera.types';
import {rotateDisplayRoiToSensor} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';

// iOS can't inject a native frame sink (vision-camera binds the analyzer as a
// frame-processor worklet, not an imperative object — see the Slice 4 notes).
// So on iOS createRoiAnalyzer returns a plain CONFIG CARRIER: the iOS engine
// reads {rois, onStats} off request.analyze and drives its own worklet. The
// external FrameAnalyzer contract is identical; only the plumbing differs.
type IosFrameAnalyzer = FrameAnalyzer & {
  __iosConfig: {rois: Roi[]; onStats: (stats: RoiStats[]) => void};
};

/**
 * Create the injectable live-frame analyzer (the app passes the result as
 * request.analyze). The analyzer owns its ROIs + emits per-ROI luma stats via
 * onStats while framing; draw your overlay from those.
 *   - Android: a native Nitro frame sink the camera pushes frames into.
 *   - iOS: a config carrier the iOS engine's worklet reads (4b).
 */
export const createRoiAnalyzer = (
  cfg: RoiAnalyzerConfig,
): FrameAnalyzer | null => {
  if (Platform.OS === 'android') {
    return createNativeRoiAnalyzer(
      cfg.rois,
      cfg.onStats,
    ) as unknown as FrameAnalyzer | null;
  }
  const carrier: IosFrameAnalyzer = {
    __iosConfig: {rois: cfg.rois, onStats: cfg.onStats},
    dispose: () => {},
  };
  return carrier;
};

// The reusable RAW color camera. Intentionally HEADLESS — preview + overlay
// children only; the host supplies the shutter UI and calls capture() via ref.
// One contract, two engines underneath (picked by Platform at the bottom):
//   - Android: the raw-camera-android CameraX/Nitro module (3a analyzer feed,
//     3b raw+jpeg shutter switch, rawless/jpeg-only).
//   - iOS: vision-camera + ProRAW (4a preview + capture, 4b live analysis via
//     a frame-processor worklet).
// The Capture (below) is shared: both engines decode via dng-decoder.

const fileUri = (p: string): string =>
  p.startsWith('file://') ? p : `file://${p}`;

const stripScheme = (uri: string): string =>
  uri.startsWith('file://') ? uri.slice('file://'.length) : uri;

// Map a fractional ROI (0..1 in the portrait sensor-aspect frame) to DNG pixel
// coords. The DNG decodes portrait but width/height are pre-orientation
// landscape dims, so short side = width, long side = height. Hides the
// pixel/orientation math from callers (they pass the same fractional ROIs the
// overlay uses).
const roiToPixels = (roi: Roi, width: number, height: number) => {
  const effW = Math.min(width, height);
  const effH = Math.max(width, height);
  return {
    x: Math.round(roi.x * effW),
    y: Math.round(roi.y * effH),
    w: Math.round(roi.w * effW),
    h: Math.round(roi.h * effH),
  };
};

/**
 * Build a Capture over an on-disk DNG (+ optional companion JPEG). Decode runs
 * off the file for now; a later slice moves it onto an in-memory parsed handle
 * so the single parse disappears too.
 */
const makeCapture = (
  dngUri: string | undefined,
  jpegUri: string | undefined,
  width: number,
  height: number,
  retries: number,
): Capture => ({
  width,
  height,
  hasRaw: dngUri != null,
  hasJpeg: jpegUri != null,
  retries,
  decodeRois: async (rois: Roi[]): Promise<LinearRgb[]> => {
    if (!dngUri) {
      throw new Error(
        'decodeRois: this capture has no RAW/DNG (jpeg-only) — nothing to decode',
      );
    }
    // One parse, all ROIs. NOTE: decodeDngRois is synchronous native (blocks
    // the JS thread); off-thread decode is a later slice.
    return DngDecoderHybrid.decodeDngRois(
      dngUri,
      rois.map(r => roiToPixels(r, width, height)),
    );
  },
  renderPreview: async maxDim => {
    if (!dngUri) {
      throw new Error('renderPreview: this capture has no RAW/DNG (jpeg-only)');
    }
    const p = await DngDecoderHybrid.renderPreview(dngUri, maxDim);
    return {uri: p.uri, width: p.width, height: p.height};
  },
  save: async (opts?: SaveOptions) => {
    // The native capture already wrote the DNG/JPEG to the app cache. "Save"
    // copies them to a chosen dir (default: cache, i.e. leave in place). Only
    // the requested kinds are kept.
    const result: {dngUri?: string; jpegUri?: string} = {};
    const copyInto = (srcUri: string): string => {
      if (!opts?.dir) {
        return srcUri; // leave in cache
      }
      const name = stripScheme(srcUri).split('/').pop() ?? 'capture';
      const dest = new File(opts.dir, name);
      new File(srcUri).copy(dest);
      return dest.uri;
    };
    if (dngUri && opts?.dng !== false) {
      result.dngUri = copyInto(dngUri);
    }
    if (jpegUri && opts?.jpeg !== false) {
      result.jpegUri = copyInto(jpegUri);
    }
    return result;
  },
  dispose: () => {
    if (dngUri) {
      deleteAsync(dngUri, {idempotent: true}).catch(() => {});
    }
    if (jpegUri) {
      deleteAsync(jpegUri, {idempotent: true}).catch(() => {});
    }
  },
});

// iPhone rear sensor is 4:3 landscape; the DNG rotates to 3:4 portrait for
// display. width / height. (The Android native ViewPort also crops to 3:4.)
const SENSOR_ASPECT = 3 / 4;

// iOS capture retry (analog of Android approach A). The detach dance can
// reconfigure to a non-DNG format ("PhotoOutput does not support raw capture");
// retry by forcing a fresh reconfigure. SETTLE = pause after the detach
// reconfigure before shooting (let the RAW format go active); RETRY_SETTLE =
// pause after reattaching before re-detaching on a retry.
const IOS_CAPTURE_MAX_RETRIES = 2; // 3 attempts total
const IOS_CAPTURE_SETTLE_MS = 150;
const IOS_CAPTURE_RETRY_SETTLE_MS = 300;

// Fixed-aspect wrapper, centered + letterboxed inside its parent, so the
// preview, the overlay children, and the captured DNG all share one coordinate
// system. Used by BOTH engines so the live overlay lines up with the preview
// (and maps 1:1 to the DNG) identically on each platform — iOS letterboxes via
// resizeMode="contain"; Android's native 3:4 ViewPort fills this 3:4 box
// exactly (no crop).
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
// Android engine: the raw-camera-android CameraX/Nitro module (vision-camera
// can't save RAW_SENSOR on Android). Owns its own native preview + overlay.

const AndroidRawColorEngine = forwardRef<
  RawColorCameraHandle,
  RawColorCameraProps
>(function AndroidRawColorEngine(
  {active, request, children, onCapabilities, onError, style},
  ref,
) {
  const {hasPermission, requestPermission} = useCameraPermission();

  useEffect(() => {
    if (active && !hasPermission) {
      requestPermission().catch(err => onError?.(err as Error));
    }
  }, [active, hasPermission, requestPermission, onError]);

  const analyze = request.analyze;
  // No-RAW simulation: bind preview+jpeg(+analysis), capture a JPEG only.
  const rawless = request.raw === false;
  // FRAMING bind: with an analyzer we bind preview+raw+analysis (3-stream cap,
  // no room for JPEG too); without one we keep JPEG per policy
  // (preview+raw+jpeg). Drives the native view's preferJpeg. (Ignored in
  // rawless mode — that path has no RAW stream to trade against.)
  const framingPreferJpeg = !analyze && request.jpeg !== 'never';
  // CAPTURE: want the JPEG unless policy is 'never' — even while analysis is
  // bound, the native side does a shutter switch (3b) to grab RAW+JPEG and
  // restore analysis. So the JPEG is available regardless of the framing bind.
  const captureWantsJpeg = request.jpeg !== 'never';

  // Inject / detach the live analyzer. The camera's analysis callback pumps
  // frames into it off the JS thread; it emits onStats.
  useEffect(() => {
    if (!active || !hasPermission || Platform.OS !== 'android' || !analyze) {
      return;
    }
    RawCameraAndroidHybrid.setAnalyzer(
      analyze as unknown as NativeFrameAnalyzer,
    );
    return () => RawCameraAndroidHybrid.clearAnalyzer();
  }, [active, hasPermission, analyze]);

  // Warm the session + report resolved capabilities once bound.
  useEffect(() => {
    if (!active || !hasPermission || Platform.OS !== 'android') {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await RawCameraAndroidHybrid.getCaptureCapabilities();
        if (!cancelled) {
          onCapabilities?.({
            rawAvailable: true,
            willCaptureRaw: !rawless,
            willCaptureJpeg: rawless || captureWantsJpeg,
            analysisActive: !!analyze,
            switchesAtCapture: !rawless && !!analyze && captureWantsJpeg,
          });
        }
      } catch (err) {
        if (!cancelled) {
          onError?.(err as Error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    active,
    hasPermission,
    rawless,
    captureWantsJpeg,
    analyze,
    onCapabilities,
    onError,
  ]);

  useImperativeHandle(
    ref,
    (): RawColorCameraHandle => ({
      capture: async opts => {
        const photo = await RawCameraAndroidHybrid.capturePhoto({
          skipJpeg: !captureWantsJpeg,
        });
        // Sensor is read out + files are on disk → safe to move. (A later
        // slice fires this at the exact sensor-done instant natively.)
        opts?.onCaptured?.();
        // rawless (no-RAW) captures return an empty dngPath → jpeg-only.
        return makeCapture(
          photo.dngPath ? fileUri(photo.dngPath) : undefined,
          photo.jpegPath ? fileUri(photo.jpegPath) : undefined,
          photo.width,
          photo.height,
          photo.retries, // native-side retry count
        );
      },
    }),
    [captureWantsJpeg],
  );

  const preview = useMemo<ReactNode>(() => {
    if (!active || !hasPermission) {
      return null;
    }
    return (
      <RawCameraAndroidView
        style={StyleSheet.absoluteFill}
        showRoiOverlay={false}
        preferJpeg={framingPreferJpeg}
        rawless={rawless}
      />
    );
  }, [active, hasPermission, framingPreferJpeg, rawless]);

  return (
    <View style={[styles.fill, style]}>
      <SensorAspectFrame aspect={SENSOR_ASPECT}>
        {preview}
        {children}
      </SensorAspectFrame>
    </View>
  );
});

// ---------------------------------------------------------------------------
// iOS engine: vision-camera + the ProRAW patch. A vision-camera frame output
// drives the live preview (a photo-output-only session renders no viewfinder);
// because that output forces a non-RAW format, it's detached around each
// capture (the onConfigured dance). Mechanics ported verbatim from the proven
// SimpleRawCamera iOS path, reshaped as the headless RawColorCamera contract.
// Slice 4a: preview + capture. Slice 4b: the same frame output also runs the
// live ROI analyzer when request.analyze is present (useIosFrameAnalyzer).

// Generalized iOS ROI frame analyzer: ONE vision-camera frame output that both
// (a) drives the live preview and (b) — when `rois` is non-empty — runs the
// native Y-plane analyzer over each ROI and emits per-ROI {mean,variance} to
// `onStats` via runOnJS (throttled to every other frame, like Android). With
// no ROIs it's preview-only (just disposes each frame). This is iOS's
// expression of the injected FrameAnalyzer contract — createRoiAnalyzer carries
// {rois,onStats} and the engine feeds them here.
function useIosFrameAnalyzer(
  rois: Roi[],
  onStats: ((stats: RoiStats[]) => void) | undefined,
) {
  const roisShared = useSharedValue<Roi[]>(rois);
  const frameParity = useSharedValue(0);
  // Write shared values in an effect, not render (reanimated strict-mode).
  useEffect(() => {
    roisShared.value = rois;
  }, [rois, roisShared]);

  // Stable JS sink the worklet invokes via runOnJS.
  const emit = useCallback((stats: RoiStats[]) => onStats?.(stats), [onStats]);

  return useFrameOutput({
    // See useRoiFrameAnalyzer: these two keep RAW capture compatible on iOS.
    pixelFormat: 'native',
    enablePreviewSizedOutputBuffers: true,
    onFrame: frame => {
      'worklet';
      try {
        const rs = roisShared.value;
        if (rs.length === 0) {
          return; // preview-only — no analysis configured
        }
        // Process every other frame (~half the capture rate to the overlay).
        frameParity.value = frameParity.value === 0 ? 1 : 0;
        if (frameParity.value !== 0) {
          return;
        }
        if (!frame.isPlanar) {
          return;
        }
        const planes = frame.getPlanes();
        if (planes.length === 0) {
          return;
        }
        const yPlane = planes[0];
        const buf = yPlane.getPixelBuffer();
        const w = yPlane.width;
        const h = yPlane.height;
        const stride = yPlane.bytesPerRow;
        const out: RoiStats[] = [];
        for (let i = 0; i < rs.length; i += 1) {
          const s = rotateDisplayRoiToSensor(rs[i], frame.orientation);
          const st = FrameAnalyzerHybrid.analyzeYPlane(
            buf,
            stride,
            w,
            h,
            Math.round(s.x * w),
            Math.round(s.y * h),
            Math.round(s.w * w),
            Math.round(s.h * h),
          );
          out.push({roi: i, mean: st.mean, variance: st.variance});
        }
        runOnJS(emit)(out);
      } finally {
        frame.dispose();
      }
    },
  });
}

const IosRawColorEngine = forwardRef<RawColorCameraHandle, RawColorCameraProps>(
  function IosRawColorEngine(
    {active, request, children, onCapabilities, onError, style},
    ref,
  ) {
    const {hasPermission, requestPermission} = useCameraPermission();

    // Prefer a true single-wide physical back camera (Apple RAW is most
    // reliable there, not on a virtual multi-cam aggregate); fall back to
    // the default back camera.
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

    useEffect(() => {
      if (active && !hasPermission) {
        requestPermission().catch(err => onError?.(err as Error));
      }
    }, [active, hasPermission, requestPermission, onError]);

    // Stable identity — vision-camera diffs photo-output options by identity to
    // decide whether to reconfigure; a fresh object each render loops.
    const photoOutputOptions = useMemo(
      () => ({
        targetResolution: {width: 4032, height: 3024},
        containerFormat: 'dng' as const,
      }),
      [],
    );
    const photoOutput = usePhotoOutput(photoOutputOptions);

    // Live analysis config carried on request.analyze (createRoiAnalyzer). No
    // config → the frame output is preview-only.
    const analyze = request.analyze as IosFrameAnalyzer | undefined;
    const analyzerConfig = analyze?.__iosConfig;
    const analyzerRois = useMemo(
      () => analyzerConfig?.rois ?? [],
      [analyzerConfig],
    );
    // ONE frame output drives both the preview AND (when ROIs are present) the
    // live analyzer. iOS needs a frame output to render the viewfinder at all.
    const frameOutput = useIosFrameAnalyzer(
      analyzerRois,
      analyzerConfig?.onStats,
    );

    // A frame output forces a non-RAW format, so detach it around each capture:
    // flip detachedForCapture → session reconfigures to a RAW-capable format
    // (awaited via onConfigured) → shoot → reattach.
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

    const wantJpeg = request.jpeg !== 'never';
    useEffect(() => {
      if (!active || !hasPermission) {
        return;
      }
      onCapabilities?.({
        rawAvailable: true,
        willCaptureRaw: request.raw !== false,
        willCaptureJpeg: wantJpeg,
        analysisActive: analyzerRois.length > 0,
        // The detach/reconfigure to a RAW-capable format IS a shutter-time
        // switch (same role as Android's 3b stream swap).
        switchesAtCapture: true,
      });
    }, [
      active,
      hasPermission,
      request.raw,
      wantJpeg,
      analyzerRois.length,
      onCapabilities,
    ]);

    const capturingRef = useRef(false);
    useImperativeHandle(
      ref,
      (): RawColorCameraHandle => ({
        capture: async opts => {
          if (capturingRef.current) {
            throw new Error('capture already in progress');
          }
          capturingRef.current = true;
          const sleep = (ms: number) =>
            new Promise<void>(r => setTimeout(r, ms));
          // Wait for the session to reconfigure to the given outputs (the
          // onConfigured callback resolves this). Returns a promise set up
          // BEFORE the state change so we can't miss the event.
          const reconfigureTo = async (detached: boolean) => {
            const done = new Promise<void>(resolve => {
              configResolveRef.current = resolve;
            });
            setDetachedForCapture(detached);
            await done;
          };
          try {
            // Retry (iOS analog of approach A): the detach dance occasionally
            // reconfigures to a format that doesn't support DNG ("PhotoOutput
            // does not support raw capture"). On failure, reattach → re-detach
            // to force a FRESH RAW-capable reconfigure, then retry.
            let lastErr: unknown;
            for (
              let attempt = 0;
              attempt <= IOS_CAPTURE_MAX_RETRIES;
              attempt++
            ) {
              try {
                if (attempt > 0) {
                  console.warn(
                    `[rawperf] iOS capture retry ${attempt}/${IOS_CAPTURE_MAX_RETRIES}: ${String(lastErr)}`,
                  );
                  await reconfigureTo(false); // reattach (frame output back)
                  await sleep(IOS_CAPTURE_RETRY_SETTLE_MS);
                }
                await reconfigureTo(true); // detach → RAW-capable reconfigure
                await sleep(IOS_CAPTURE_SETTLE_MS); // let the format settle

                const photo = await photoOutput.capturePhoto({}, {});
                if (!photo.isRawPhoto) {
                  // Got a processed photo — refuse to emit a JPEG-shaped
                  // result from RAW data; retry the reconfigure.
                  throw new Error(
                    'expected a RAW photo but received a processed one',
                  );
                }
                const rawUri = fileUri(await photo.saveToTemporaryFileAsync());
                // iOS DNGs embed a full-res Apple JPEG preview; pull it out as
                // the companion (best-effort). Skipped when jpeg:'never'.
                let jpegUri: string | undefined;
                if (wantJpeg) {
                  try {
                    jpegUri = fileUri(
                      DngDecoderHybrid.extractDngPreviewJpeg(rawUri),
                    );
                  } catch (err) {
                    onError?.(err as Error);
                  }
                }
                // Sensor read out + files on disk → safe to move.
                opts?.onCaptured?.();
                return makeCapture(
                  rawUri,
                  jpegUri,
                  photo.width,
                  photo.height,
                  attempt, // this-capture retry count (0 = first try)
                );
              } catch (err) {
                lastErr = err;
              }
            }
            throw lastErr instanceof Error
              ? lastErr
              : new Error(String(lastErr));
          } finally {
            // Reattach the frame output (preview resumes).
            setDetachedForCapture(false);
            capturingRef.current = false;
          }
        },
      }),
      [photoOutput, wantJpeg, onError],
    );

    const ready = !!device && hasPermission && active;
    return (
      <View style={[styles.fill, style]}>
        {ready ? (
          <SensorAspectFrame aspect={SENSOR_ASPECT}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={active}
              outputs={outputs}
              onConfigured={onConfigured}
              // Portrait-locked: tie orientation to the UI, not the device.
              orientationSource="interface"
              resizeMode="contain"
              enableNativeTapToFocusGesture={true}
            />
            {children}
          </SensorAspectFrame>
        ) : (
          <View style={[styles.fill, styles.center]}>
            <Text style={styles.message}>
              {device
                ? 'Camera permission is required to capture.'
                : 'No compatible camera was found on this device.'}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

// Public component: one contract, platform-specific engine underneath.
export const RawColorCamera = forwardRef<
  RawColorCameraHandle,
  RawColorCameraProps
>(function RawColorCamera(props, ref) {
  return Platform.OS === 'android' ? (
    <AndroidRawColorEngine ref={ref} {...props} />
  ) : (
    <IosRawColorEngine ref={ref} {...props} />
  );
});

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'black'},
  center: {alignItems: 'center', justifyContent: 'center', padding: 24},
  message: {color: 'white', fontSize: 16, textAlign: 'center'},
  sensorFrameOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
