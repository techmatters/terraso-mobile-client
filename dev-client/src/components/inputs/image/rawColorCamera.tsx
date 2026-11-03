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
  useEffect,
  useImperativeHandle,
  useMemo,
  type ReactNode,
} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {useCameraPermission} from 'react-native-vision-camera';

import {File} from 'expo-file-system';
import {deleteAsync} from 'expo-file-system/legacy';

import {DngDecoderHybrid} from 'dng-decoder';
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
  SaveOptions,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera.types';

/**
 * Create the injectable live-frame analyzer (the app passes the result as
 * request.analyze). The analyzer owns its ROIs + emits per-ROI luma stats via
 * onStats while framing; draw your overlay from those. Returns null off
 * Android (iOS analyzer is a later slice).
 */
export const createRoiAnalyzer = (
  cfg: RoiAnalyzerConfig,
): FrameAnalyzer | null =>
  createNativeRoiAnalyzer(
    cfg.rois,
    cfg.onStats,
  ) as unknown as FrameAnalyzer | null;

// The reusable RAW color camera, on the proven Android capture engine
// (raw-camera-android). Intentionally HEADLESS — preview + overlay children
// only; the host supplies the shutter UI and calls capture() via ref.
// request.analyze (Slice 3a) binds preview+raw+analysis and injects the live
// analyzer (RAW-only capture while analyzing). Still to come: the native
// preview+analysis->raw+jpeg shutter switch (3b) and the iOS engine (Slice 4;
// iOS currently renders a placeholder — the test uses SimpleRawCamera there).

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
  dngUri: string,
  jpegUri: string | undefined,
  width: number,
  height: number,
): Capture => ({
  width,
  height,
  hasRaw: true,
  hasJpeg: jpegUri != null,
  decodeRois: async (rois: Roi[]): Promise<LinearRgb[]> =>
    // One parse, all ROIs. NOTE: decodeDngRois is synchronous native (blocks
    // the JS thread); off-thread decode is a later slice.
    DngDecoderHybrid.decodeDngRois(
      dngUri,
      rois.map(r => roiToPixels(r, width, height)),
    ),
  renderPreview: async maxDim => {
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
    if (opts?.dng !== false) {
      result.dngUri = copyInto(dngUri);
    }
    if (jpegUri && opts?.jpeg !== false) {
      result.jpegUri = copyInto(jpegUri);
    }
    return result;
  },
  dispose: () => {
    deleteAsync(dngUri, {idempotent: true}).catch(() => {});
    if (jpegUri) {
      deleteAsync(jpegUri, {idempotent: true}).catch(() => {});
    }
  },
});

export const RawColorCamera = forwardRef<
  RawColorCameraHandle,
  RawColorCameraProps
>(function RawColorCamera(
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
  // FRAMING bind: with an analyzer we bind preview+raw+analysis (3-stream cap,
  // no room for JPEG too); without one we keep JPEG per policy
  // (preview+raw+jpeg). Drives the native view's preferJpeg.
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
            willCaptureRaw: request.raw !== false,
            willCaptureJpeg: captureWantsJpeg,
            analysisActive: !!analyze,
            switchesAtCapture: !!analyze && captureWantsJpeg,
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
    request.raw,
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
        return makeCapture(
          fileUri(photo.dngPath),
          photo.jpegPath ? fileUri(photo.jpegPath) : undefined,
          photo.width,
          photo.height,
        );
      },
    }),
    [captureWantsJpeg],
  );

  const preview = useMemo<ReactNode>(() => {
    if (Platform.OS !== 'android') {
      return (
        <View style={[styles.fill, styles.center]}>
          <Text style={styles.message}>
            RawColorCamera: iOS engine lands in a later slice — use
            SimpleRawCamera on iOS for now.
          </Text>
        </View>
      );
    }
    if (!active || !hasPermission) {
      return null;
    }
    return (
      <RawCameraAndroidView
        style={StyleSheet.absoluteFill}
        showRoiOverlay={false}
        preferJpeg={framingPreferJpeg}
      />
    );
  }, [active, hasPermission, framingPreferJpeg]);

  return (
    <View style={[styles.fill, style]}>
      {preview}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'black'},
  center: {alignItems: 'center', justifyContent: 'center', padding: 24},
  message: {color: 'white', fontSize: 16, textAlign: 'center'},
});
