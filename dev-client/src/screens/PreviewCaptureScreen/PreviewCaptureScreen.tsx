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
  DEFAULT_ROI_PRESET_INDEX,
  ROI_PRESETS,
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
type Destination = 'COLOR_ANALYSIS' | 'SOIL_INPUT_soilColor';

type Props = {
  pitProps: SoilPitInputScreenProps;
  mode: Mode;
  // Where to go after capture (default COLOR_ANALYSIS). The combined prototype
  // UX routes back to its own screen.
  destination?: Destination;
  // Show the guide-size controls (no / smaller / bigger) over the preview. Used
  // by the combined prototype; the classic preview camera leaves this off.
  guideControls?: boolean;
  // Force a RAW+JPEG capture regardless of the "Use RAW when available"
  // preference. The combined (raw-colour) prototype sets this so a DNG is
  // always produced for the raw analysis, histogram editor, and Share.
  forceRaw?: boolean;
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

// Default guide size for the combined (guide-controls) flow: one notch smaller
// than the baseline preset — between the original medium default and the tiny
// end. The presets are pre-designed square and non-overlapping, so stepping
// through them can never make the boxes overlap.
const COMBINED_DEFAULT_PRESET_INDEX = Math.max(0, DEFAULT_ROI_PRESET_INDEX - 1);

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
  refRoi: Roi,
  sampleRoi: Roi,
): Promise<{reference: CropResult; soil: CropResult}> => {
  const [refPhoto, soilPhoto] = await Promise.all([
    cropJpegByRoi(jpegUri, sensorWidth, sensorHeight, refRoi),
    cropJpegByRoi(jpegUri, sensorWidth, sensorHeight, sampleRoi),
  ]);
  // The `crop` field is a UI breadcrumb for the manual crop screen. Since
  // the auto-crop path doesn't resume via that screen, the values are
  // nominal — we set them to the full extent of the produced crop so if
  // anyone ever opens the crop UI on these the overlay starts sensible.
  const nominalCrop = {top: 0, left: 0, size: AUTO_CROP_OUTPUT_PX};
  return {
    reference: {
      photo: refPhoto,
      crop: nominalCrop,
      displayRoi: refRoi,
    },
    soil: {
      photo: soilPhoto,
      crop: nominalCrop,
      displayRoi: sampleRoi,
    },
  };
};

export const PreviewCaptureScreen = ({
  pitProps,
  mode,
  destination = 'COLOR_ANALYSIS',
  guideControls = false,
  forceRaw = false,
}: Props) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const camRef = useRef<RawColorCameraHandle>(null);
  const [capturing, setCapturing] = useState(false);
  const [quality, setQuality] = useState<RoiStats[]>([]);
  const useRaw = useUseRawWhenAvailable();

  // Guide-size state (only meaningful when `guideControls`). `guideOn` toggles
  // the ROI guide entirely (off → the user crops manually afterwards);
  // `guideIndex` steps through the pre-designed non-overlapping size presets.
  const [guideOn, setGuideOn] = useState(true);
  const [guideIndex, setGuideIndex] = useState(
    guideControls ? COMBINED_DEFAULT_PRESET_INDEX : DEFAULT_ROI_PRESET_INDEX,
  );

  // The guide is active when its controls are shown and it's toggled on, or —
  // for the classic flow — whenever we're in 'auto' mode.
  const guideActive = guideControls ? guideOn : mode === 'auto';

  const [refRoi, sampleRoi] = useMemo(
    () => [ROI_PRESETS[guideIndex].ref, ROI_PRESETS[guideIndex].sample],
    [guideIndex],
  );

  // Analyzer runs while the guide is active — the red/green overlay helps users
  // compose when the ROIs will become the auto-crop. With the guide off the
  // user re-crops anyway, so a region overlay is misleading.
  const analyzer = useMemo(() => {
    if (!guideActive) {
      return undefined;
    }
    return (
      createRoiAnalyzer({
        rois: [refRoi, sampleRoi],
        onStats: setQuality,
      }) ?? undefined
    );
  }, [guideActive, refRoi, sampleRoi]);

  const request = useMemo<CaptureRequest>(
    () => ({raw: forceRaw || useRaw, jpeg: 'always', analyze: analyzer}),
    [forceRaw, useRaw, analyzer],
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

    // With the guide active, build the two CropResults from the (scaled) ROIs
    // so the colour screen opens with the regions already picked. Guide off →
    // no initialState, and the destination starts its manual crop flow.
    let initialState;
    if (guideActive) {
      try {
        initialState = await buildInitialCropState(
          saved.jpegUri,
          cap.width,
          cap.height,
          refRoi,
          sampleRoi,
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
    const photo = {
      uri: saved.jpegUri,
      width: orientedWidth,
      height: orientedHeight,
    };
    if (destination === 'SOIL_INPUT_soilColor') {
      // Pop BACK to the existing color-feature route (which hosts the combined
      // screen), delivering the captured photo via its params. popTo (not
      // navigate) guarantees we return to the existing instance rather than
      // pushing a duplicate — otherwise the camera stays under it and Save
      // lands back on the camera.
      navigation.popTo('SOIL_INPUT_soilColor', {
        ...pitProps,
        photo,
        dngUri: saved.dngUri,
        initialState,
      });
    } else {
      navigation.replace('COLOR_ANALYSIS', {
        photo,
        pitProps,
        dngUri: saved.dngUri,
        initialState,
      });
    }
  }, [
    capturing,
    destination,
    guideActive,
    navigation,
    pitProps,
    refRoi,
    sampleRoi,
    saveDir.uri,
  ]);

  const onCancel = useCallback(() => navigation.pop(), [navigation]);

  const showOverlay = guideActive;

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
            [refRoi, sampleRoi].map((roi, i) => {
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
        {guideControls && (
          <View style={styles.guideBar} pointerEvents="box-none">
            <Pressable
              onPress={() => setGuideOn(o => !o)}
              accessibilityRole="button"
              style={[styles.guideButton, !guideOn && styles.guideButtonOff]}>
              <Text style={styles.guideText}>
                {guideOn ? 'Guide: on' : 'Guide: off'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setGuideIndex(i => Math.max(0, i - 1))}
              disabled={!guideOn || guideIndex === 0}
              accessibilityRole="button"
              accessibilityLabel="Smaller guide"
              style={styles.guideButton}>
              <Text style={styles.guideText}>–</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setGuideIndex(i => Math.min(ROI_PRESETS.length - 1, i + 1))
              }
              disabled={!guideOn || guideIndex === ROI_PRESETS.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Bigger guide"
              style={styles.guideButton}>
              <Text style={styles.guideText}>+</Text>
            </Pressable>
          </View>
        )}
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
  guideBar: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  guideButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  guideButtonOff: {backgroundColor: 'rgba(200,60,60,0.7)'},
  guideText: {color: 'white', fontSize: 16, fontWeight: '600'},
});
