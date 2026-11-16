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

import {useIsFocused} from '@react-navigation/native';

import {
  createRoiAnalyzer,
  RawColorCamera,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera';
import type {
  CaptureRequest,
  RawColorCameraHandle,
  RoiStats,
} from 'terraso-mobile-client/components/inputs/image/rawColorCamera.types';
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {useUseRawWhenAvailable} from 'terraso-mobile-client/model/rawColor/colorCameraPrefs';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import type {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

// New Preview UX entry point into the colour-analysis flow (toggled by
// Settings → Color/Camera → "Use new Preview UX"). Hosts the shared RAW
// capture camera with a live ROI overlay; after shutter, persists DNG+JPG
// to a managed cache dir and hands control to COLOR_ANALYSIS with the
// captured files. From there the existing crop / colour / Info UX takes
// over, and the Soil Images queue picks up BOTH files (if present) when
// the user leaves ColorAnalysisHomeScreen.

type Props = {
  pitProps: SoilPitInputScreenProps;
};

const roiBoxStyle = (
  roi: {x: number; y: number; w: number; h: number},
  color: string,
) => ({
  position: 'absolute' as const,
  left: `${roi.x * 100}%` as `${number}%`,
  top: `${roi.y * 100}%` as `${number}%`,
  width: `${roi.w * 100}%` as `${number}%`,
  height: `${roi.h * 100}%` as `${number}%`,
  borderWidth: 3,
  borderColor: color,
});

export const PreviewCaptureScreen = ({pitProps}: Props) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const camRef = useRef<RawColorCameraHandle>(null);
  const [capturing, setCapturing] = useState(false);
  const [quality, setQuality] = useState<RoiStats[]>([]);
  const useRaw = useUseRawWhenAvailable();

  // One live analyzer wired into the sensor-aspect preview frame so the
  // red/green overlay tracks ROI framing quality while the user composes.
  const analyzer = useMemo(
    () =>
      createRoiAnalyzer({
        rois: [DISPLAY_REF_ROI, DISPLAY_SAMPLE_ROI],
        onStats: setQuality,
      }) ?? undefined,
    [],
  );

  const request = useMemo<CaptureRequest>(
    () => ({raw: useRaw, jpeg: 'always', analyze: analyzer}),
    [useRaw, analyzer],
  );

  // Where captured files land. Managed cache: the OS can evict under
  // pressure, but the Soil Images queue is designed to tolerate that
  // (surfaces failed uploads rather than silently losing data).
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
      // Release in-memory buffers; the saved files persist on their own.
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
    // Reset — the screen will typically unmount on navigation.
    setCapturing(false);
    navigation.replace('COLOR_ANALYSIS', {
      photo: {uri: saved.jpegUri, width: cap.width, height: cap.height},
      pitProps,
      dngUri: saved.dngUri,
    });
  }, [capturing, navigation, pitProps, saveDir.uri]);

  const onCancel = useCallback(() => navigation.pop(), [navigation]);

  return (
    <ScreenScaffold AppBar={<AppBar title="Capture soil color" />}>
      <View style={styles.fill}>
        <RawColorCamera
          ref={camRef}
          active={isFocused}
          request={request}
          style={StyleSheet.absoluteFill}
          onError={e => console.warn('[previewCapture] camera error', e)}>
          {[DISPLAY_REF_ROI, DISPLAY_SAMPLE_ROI].map((roi, i) => {
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
