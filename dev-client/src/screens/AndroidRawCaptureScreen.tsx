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

import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';

import {useKeepAwake} from 'expo-keep-awake';

import {DngDecoderHybrid} from 'dng-decoder';
import {RawCameraAndroidHybrid, RawCameraAndroidView} from 'raw-camera-android';

import {
  AndroidRawCaptureCallbacks,
  consumeAndroidRawCaptureCallbacks,
} from 'terraso-mobile-client/components/inputs/image/androidRawCaptureRequest';
import type {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {
  ChartGuideOverlay,
  SENSOR_ASPECT_PORTRAIT,
  SensorAspectFrame,
} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import type {ChartGuide} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Full-screen React Navigation route for Android RAW capture. Owns the
// native RawCameraAndroidView (which drives CameraSessionManager via
// its window-attach lifecycle), and pops back with the captured
// {kind:'raw', ...} CaptureResult by invoking the callbacks stashed
// in androidRawCaptureRequest.
//
// This exists as a separate screen (rather than an in-place overlay
// on RawCameraView) because the CameraX pipeline needs a full-screen,
// primary-Window container to work — CameraX doesn't play with RN's
// Modal (Dialog window) or with an absolute overlay trapped inside a
// bottom-sheet parent tree. Navigating to a dedicated screen gets us
// exactly the environment the standalone dev test screen used to
// prove capture works.
export const AndroidRawCaptureScreen = () => {
  const navigation = useNavigation();
  // Screen is only mounted while the user is on it, so a plain
  // useKeepAwake tied to component lifetime is exactly what we want.
  // Prevents Android's idle-dim from kicking in while the user is
  // framing a card in the phase-8 overlay.
  useKeepAwake('AndroidRawCaptureScreen');

  // Grab the pending callbacks once at mount. Missing callbacks means
  // the screen was opened directly (deep link, dev tools) rather than
  // through RawCameraView — treat that as an error UI.
  const callbacksRef = useRef<AndroidRawCaptureCallbacks | null>(null);
  const [noCallbacks, setNoCallbacks] = useState(false);
  const [chartGuide, setChartGuide] = useState<ChartGuide | null>(null);
  useEffect(() => {
    const cb = consumeAndroidRawCaptureCallbacks();
    if (cb == null) {
      console.warn('AndroidRawCaptureScreen mounted with no pending callbacks');
      setNoCallbacks(true);
    }
    callbacksRef.current = cb;
    setChartGuide(cb?.chartGuide ?? null);
  }, []);

  const [isCapturing, setIsCapturing] = useState(false);

  // Fire onCancel if the user pops via the AppBar back button (or
  // Android system back) without going through shutter. Won't fire on
  // shutter success — we set cancelledRef.current before the pop in
  // that path so this beforeRemove is idempotent-safe.
  const cancelledRef = useRef(false);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      if (cancelledRef.current) return;
      cancelledRef.current = true;
      callbacksRef.current?.onCancel();
      callbacksRef.current = null;
    });
    return unsub;
  }, [navigation]);

  const shutter = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const {dngPath, width, height} =
        await RawCameraAndroidHybrid.capturePhoto();
      // Diagnostic: DNG's raw pixel dims. If these are much bigger
      // (as a fraction of sensor) than the on-screen Preview stream
      // dims, the RAW capture has a wider field of view than what
      // the user framed to — that's the Android chart-validator's
      // WYSIWYG break.
      console.log(
        `[AndroidRawCaptureScreen] DNG captured: ${width}x${height}` +
          ` (aspect=${(width / height).toFixed(3)})`,
      );
      const result: CaptureResult = {
        kind: 'raw',
        dngPath,
        width,
        height,
        decodeRoi: async roi => {
          const [rgb] = await DngDecoderHybrid.decodeDngRois(dngPath, [roi]);
          return rgb;
        },
        renderPreview: async maxDim => {
          const p = await DngDecoderHybrid.renderPreview(dngPath, maxDim);
          return {uri: p.uri, width: p.width, height: p.height};
        },
        dispose: () => {},
      };
      // Pop AndroidRawCaptureScreen FIRST, THEN invoke the callback.
      // The callback typically synchronously navigates to the
      // downstream RAW analysis screen (push). If we pop() after the
      // callback, we'd pop the analysis screen we just pushed instead
      // of AndroidRawCaptureScreen.
      cancelledRef.current = true; // suppress the beforeRemove onCancel
      const cb = callbacksRef.current;
      callbacksRef.current = null;
      navigation.pop();
      cb?.onCapture(result);
    } catch (err) {
      console.error('AndroidRawCaptureScreen shutter failed:', err);
      Alert.alert('Capture failed', String(err), [
        {text: 'OK', onPress: () => navigation.pop()},
      ]);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, navigation]);

  // Structure kept close to the earlier RawCameraAndroidTestScreen that
  // we know worked — ScreenScaffold + AppBar chrome, view inside a
  // plain flex:1 container. Deviating from that (e.g. StatusBar hidden
  // + bare View) somehow leaves CameraX in a bad state where
  // takePicture times out. In chart-guide mode we wrap the preview in
  // SensorAspectFrame so screen ↔ DNG coords match; in soil-colour
  // mode we keep the old absoluteFill (WYSIWYG isn't required — the
  // ROI picker is post-capture).
  return (
    <ScreenScaffold AppBar={<AppBar title="Android RAW capture" />}>
      <View style={styles.container}>
        {/*
         * Native view stays flat/fullscreen — nesting it inside a
         * fixed-size wrapper leaves CameraX in a bad state where
         * takePicture times out. In chart-guide mode we instead ask
         * the PreviewView to FIT_CENTER (letterbox the 3:4 preview
         * inside the tall view), and wrap only the JS ChartGuideOverlay
         * in a matching SensorAspectFrame so it lands on the same
         * letterboxed region. Result: the on-screen guide covers the
         * same fraction of the sensor image as the analyser's guide
         * covers of the captured DNG.
         */}
        <RawCameraAndroidView
          style={StyleSheet.absoluteFill}
          showRoiOverlay={!chartGuide}
          previewFitCenter={!!chartGuide}
        />
        {chartGuide && (
          <SensorAspectFrame aspect={SENSOR_ASPECT_PORTRAIT}>
            <ChartGuideOverlay guide={chartGuide} />
          </SensorAspectFrame>
        )}
        <View style={styles.bottomBar}>
          <Pressable
            onPress={shutter}
            disabled={isCapturing || noCallbacks}
            accessibilityRole="button"
            accessibilityLabel="Capture"
            style={({pressed}) => [
              styles.shutter,
              (pressed || isCapturing) && styles.shutterPressed,
            ]}>
            <View style={styles.shutterInner} />
          </Pressable>
        </View>
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 24,
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
    opacity: 0.7,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
});
