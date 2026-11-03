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
import {RawCameraAndroidHybrid, RawCameraAndroidView} from 'raw-camera-android';

import type {
  Capture,
  LinearRgb,
  RawColorCameraHandle,
  RawColorCameraProps,
  Roi,
  SaveOptions,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera.types';

// Slice 2: the reusable RAW color camera, implemented on the proven Android
// capture engine (raw-camera-android). It is intentionally HEADLESS — preview
// + overlay children only; the host supplies the shutter UI and calls
// capture() via ref. The iOS engine, the native preview+analysis->raw+jpeg
// switch, and the injected-analyzer live feed land in later slices; until then
// request.analyze is accepted but not yet wired, and iOS renders a placeholder.

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

  // preferJpeg governs the native 3-stream fallback: keep JPEG unless the
  // caller never wants it. (The real preview+analysis<->raw+jpeg switch is a
  // later native slice; today the bind is static.)
  const wantJpeg = request.jpeg !== 'never';

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
            willCaptureJpeg: wantJpeg,
            analysisActive: false, // analyzer feed lands in a later slice
            switchesAtCapture: false,
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
  }, [active, hasPermission, request.raw, wantJpeg, onCapabilities, onError]);

  useImperativeHandle(
    ref,
    (): RawColorCameraHandle => ({
      capture: async opts => {
        const photo = await RawCameraAndroidHybrid.capturePhoto({
          skipJpeg: !wantJpeg,
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
    [wantJpeg],
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
        preferJpeg={wantJpeg}
      />
    );
  }, [active, hasPermission, wantJpeg]);

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
