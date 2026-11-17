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

import {useCallback, useMemo, useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Directory, Paths} from 'expo-file-system';
import {
  ActionCrop,
  ActionResize,
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import {useIsFocused} from '@react-navigation/native';

import {PhotoWithBase64} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {
  createRoiAnalyzer,
  RawColorCamera,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera';
import type {
  CaptureRequest,
  RawColorCameraHandle,
  Roi,
  RoiStats,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera.types';
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {useUseRawWhenAvailable} from 'terraso-mobile-client/model/rawColor/colorCameraPrefs';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import type {CropResult} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorCropScreen';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import type {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

// Shared live-preview capture screen. Sits between the two Settings toggles —
// "Use RAW when available" (whether the capture is RAW+JPEG vs JPEG-only on
// a RAW-capable device) and "Use new Preview UX" (whether to skip the
// tap-to-crop step by using the preview ROIs directly).
//
// Routed to by CameraWorkflow whenever EITHER toggle is on. The matrix of
// outcomes for a RAW-capable device:
//
//   use-raw ON  + new-ux ON  → RAW+JPEG capture, ROIs auto-crop, skip crop UI
//   use-raw ON  + new-ux OFF → RAW+JPEG capture, user still does tap-to-crop
//   use-raw OFF + new-ux ON  → JPEG-only capture, ROIs auto-crop, skip crop UI
//   use-raw OFF + new-ux OFF → not routed here; existing PickImageButton path
//
// On a non-RAW device the RAW toggle is effectively ignored (the engine
// falls back to JPEG regardless), so the new-ux toggle alone decides the
// right half of the matrix. Both UX modes always upload whichever files
// were produced (JPEG, or JPEG + DNG) via the Soil Images queue.

type Mode = 'auto' | 'crop';

type Props = {
  pitProps: SoilPitInputScreenProps;
  mode: Mode;
};

const roiBoxStyle = (roi: Roi, color: string) => ({
  position: 'absolute' as const,
  left: `${roi.x * 100}%` as `${number}%`,
  top: `${roi.y * 100}%` as `${number}%`,
  width: `${roi.w * 100}%` as `${number}%`,
  height: `${roi.h * 100}%` as `${number}%`,
  borderWidth: 3,
  borderColor: color,
});

// Match the existing crop pipeline's 200x200 output so downstream colour
// analysis sees the same shape (sRGB 200x200 base64 JPEG) regardless of how
// the crop was produced — manual pinch-to-crop vs this ROI-derived auto-crop.
const AUTO_CROP_OUTPUT_PX = 200;

// Crop the JPEG by a fractional (portrait-space) ROI, resize to 200x200, and
// return base64. manipulateAsync's crop coordinates are in the EXIF-oriented
// pixel space, so we need the ORIENTED (portrait) dimensions, which for a
// landscape-stored sensor JPEG are short-side = width, long-side = height.
const cropJpegByRoi = async (
  jpegUri: string,
  sensorWidth: number,
  sensorHeight: number,
  roi: Roi,
): Promise<PhotoWithBase64> => {
  const orientedWidth = Math.min(sensorWidth, sensorHeight);
  const orientedHeight = Math.max(sensorWidth, sensorHeight);
  const cropAction: ActionCrop = {
    crop: {
      originX: Math.round(roi.x * orientedWidth),
      originY: Math.round(roi.y * orientedHeight),
      width: Math.round(roi.w * orientedWidth),
      height: Math.round(roi.h * orientedHeight),
    },
  };
  const resizeAction: ActionResize = {
    resize: {width: AUTO_CROP_OUTPUT_PX, height: AUTO_CROP_OUTPUT_PX},
  };
  const result = await manipulateAsync(jpegUri, [cropAction, resizeAction], {
    base64: true,
    compress: 1.0,
    format: SaveFormat.JPEG,
  });
  if (!result.base64) {
    throw new Error('auto-crop: manipulateAsync returned no base64');
  }
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    base64: result.base64,
  };
};

// Build a CropResult pair from the preview ROIs — matching the shape the
// ColorAnalysisContextState expects so the Home screen's live-colour path
// can consume them without a code branch for "pre-cropped" vs "manually
// cropped".
const buildInitialCropState = async (
  jpegUri: string,
  sensorWidth: number,
  sensorHeight: number,
): Promise<{reference: CropResult; soil: CropResult}> => {
  const [refPhoto, soilPhoto] = await Promise.all([
    cropJpegByRoi(jpegUri, sensorWidth, sensorHeight, DISPLAY_REF_ROI),
    cropJpegByRoi(jpegUri, sensorWidth, sensorHeight, DISPLAY_SAMPLE_ROI),
  ]);
  // The `crop` field is a UI breadcrumb for the manual crop screen. Since
  // the auto-crop path doesn't resume via that screen, the values are
  // nominal — we set them to the full extent of the produced crop so if
  // anyone ever opens the crop UI on these the overlay starts sensible.
  const nominalCrop = {top: 0, left: 0, size: AUTO_CROP_OUTPUT_PX};
  return {
    reference: {photo: refPhoto, crop: nominalCrop},
    soil: {photo: soilPhoto, crop: nominalCrop},
  };
};

export const PreviewCaptureScreen = ({pitProps, mode}: Props) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const camRef = useRef<RawColorCameraHandle>(null);
  const [capturing, setCapturing] = useState(false);
  const [quality, setQuality] = useState<RoiStats[]>([]);
  const useRaw = useUseRawWhenAvailable();

  // Analyzer runs only in 'auto' mode — the red/green overlay helps users
  // compose when the ROIs will become the auto-crop. In 'crop' mode the user
  // is going to re-crop anyway, so a region overlay is misleading.
  const analyzer = useMemo(() => {
    if (mode !== 'auto') {
      return undefined;
    }
    return (
      createRoiAnalyzer({
        rois: [DISPLAY_REF_ROI, DISPLAY_SAMPLE_ROI],
        onStats: setQuality,
      }) ?? undefined
    );
  }, [mode]);

  const request = useMemo<CaptureRequest>(
    () => ({raw: useRaw, jpeg: 'always', analyze: analyzer}),
    [useRaw, analyzer],
  );

  // Managed cache for the captured DNG/JPG. OS can evict under pressure, but
  // the Soil Images queue tolerates that (surfaces failed uploads rather
  // than silently losing data).
  const saveDir = useMemo(() => {
    const d = new Directory(Paths.cache, 'soilColorCaptures');
    try {
      d.create({idempotent: true});
    } catch {
      // already exists / best effort
    }
    return d;
  }, []);

  const onShutter = useCallback(async () => {
    const cam = camRef.current;
    if (!cam || capturing) {
      return;
    }
    setCapturing(true);
    let cap;
    try {
      cap = await cam.capture({
        onCaptured: () => console.log('[previewCapture] CAPTURED'),
      });
    } catch (err) {
      Alert.alert('Capture failed', String(err));
      setCapturing(false);
      return;
    }
    let saved: {dngUri?: string; jpegUri?: string};
    try {
      saved = await cap.save({dir: saveDir.uri});
    } catch (err) {
      Alert.alert('Save failed', String(err));
      cap.dispose();
      setCapturing(false);
      return;
    } finally {
      cap.dispose();
    }
    if (!saved.jpegUri) {
      Alert.alert(
        'No JPEG produced',
        'The capture returned no JPEG — downstream colour analysis needs one.',
      );
      setCapturing(false);
      return;
    }

    // In auto mode, build the two CropResults from the preview ROIs so the
    // colour-selection screen opens with the live colour already computed.
    let initialState;
    if (mode === 'auto') {
      try {
        initialState = await buildInitialCropState(
          saved.jpegUri,
          cap.width,
          cap.height,
        );
      } catch (err) {
        console.warn(
          '[previewCapture] auto-crop failed, falling back to manual crop',
          err,
        );
      }
    }

    setCapturing(false);
    // cap.width/cap.height are the sensor-native (pre-orientation) dims —
    // landscape on every phone we care about (e.g. 4032x3024 on iPhone).
    // The saved JPEG renders portrait because its EXIF orientation flips it.
    // Pass the ORIENTED dims to Photo so downstream layout (aspect-ratio
    // box in ColorAnalysisHomeScreen) sizes correctly.
    const orientedWidth = Math.min(cap.width, cap.height);
    const orientedHeight = Math.max(cap.width, cap.height);
    navigation.replace('COLOR_ANALYSIS', {
      photo: {
        uri: saved.jpegUri,
        width: orientedWidth,
        height: orientedHeight,
      },
      pitProps,
      dngUri: saved.dngUri,
      initialState,
    });
  }, [capturing, mode, navigation, pitProps, saveDir.uri]);

  const onCancel = useCallback(() => navigation.pop(), [navigation]);

  const showOverlay = mode === 'auto';

  return (
    <ScreenScaffold AppBar={<AppBar title="Capture soil color" />}>
      <View style={styles.fill}>
        <RawColorCamera
          ref={camRef}
          active={isFocused}
          request={request}
          style={StyleSheet.absoluteFill}
          onError={e => console.warn('[previewCapture] camera error', e)}>
          {showOverlay &&
            [DISPLAY_REF_ROI, DISPLAY_SAMPLE_ROI].map((roi, i) => {
              const stat = quality.find(s => s.roi === i);
              const color = stat
                ? stat.variance < 500
                  ? '#22ee22'
                  : '#ee2222'
                : 'rgba(255,255,255,0.5)';
              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={roiBoxStyle(roi, color)}
                />
              );
            })}
        </RawColorCamera>
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            style={styles.sideButton}>
            <Text style={styles.sideText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onShutter}
            disabled={capturing}
            accessibilityRole="button"
            style={[styles.shutter, capturing && styles.disabled]}
          />
          {/* Right spacer so the shutter stays visually centred. */}
          <View style={styles.sideButton} />
        </SafeAreaView>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  fill: {flex: 1, backgroundColor: 'black'},
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
  sideButton: {width: 80},
  sideText: {color: 'white', fontSize: 16},
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  disabled: {opacity: 0.4},
});
