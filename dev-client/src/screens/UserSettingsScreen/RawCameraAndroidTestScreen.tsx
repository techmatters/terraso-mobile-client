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

import {useCallback, useState} from 'react';
import {Alert, Platform, Pressable, StyleSheet, View} from 'react-native';
import Share from 'react-native-share';

import {DngDecoderHybrid} from 'dng-decoder';
import {RawCameraAndroidHybrid, RawCameraAndroidView} from 'raw-camera-android';

import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Phase-7.2 test screen: mount the native RawCameraAndroidView (which
// hands its SurfaceProvider to CameraSessionManager on window attach),
// show a shutter, and on capture decode a centered ROI so we can
// verify preview + capture + decode work together end-to-end.
export const RawCameraAndroidTestScreen = () => {
  const [busy, setBusy] = useState(false);

  const onCapture = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      console.log('RawCameraAndroidTestScreen: triggering capturePhoto…');
      const {dngPath, width, height} =
        await RawCameraAndroidHybrid.capturePhoto();
      console.log(
        `RawCameraAndroidTestScreen: captured DNG at ${dngPath} (${width}x${height})`,
      );

      try {
        const roiSize = Math.min(width, height, 1000);
        const roi = {
          x: Math.floor(width / 2 - roiSize / 2),
          y: Math.floor(height / 2 - roiSize / 2),
          w: roiSize,
          h: roiSize,
        };
        const [rgb] = await DngDecoderHybrid.decodeDngRois(dngPath, [roi]);
        console.log(
          `RawCameraAndroidTestScreen: ROI ${roi.x},${roi.y} ${roi.w}x${roi.h} → ` +
            `linear sRGB (r=${rgb.r.toFixed(4)}, g=${rgb.g.toFixed(4)}, ` +
            `b=${rgb.b.toFixed(4)})`,
        );
      } catch (err) {
        console.error('RawCameraAndroidTestScreen: decode failed:', err);
      }

      try {
        await Share.open({
          url: dngPath,
          type: 'image/x-adobe-dng',
          failOnCancel: false,
        });
      } catch (err) {
        console.error('RawCameraAndroidTestScreen: share failed:', err);
      }
    } catch (err) {
      console.error('RawCameraAndroidTestScreen: capture failed:', err);
      Alert.alert('Capture failed', String(err));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  if (Platform.OS !== 'android') {
    return (
      <ScreenScaffold AppBar={<AppBar title="Android RAW test" />}>
        <Box padding="md">
          <Text variant="body1">Android-only screen.</Text>
        </Box>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold AppBar={<AppBar title="Android RAW test (dev)" />}>
      <View style={styles.container}>
        <RawCameraAndroidView style={styles.preview} />
        <View style={styles.bottomBar}>
          <Pressable
            onPress={onCapture}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Capture RAW"
            style={({pressed}) => [
              styles.shutter,
              (pressed || busy) && styles.shutterPressed,
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
  preview: {
    ...StyleSheet.absoluteFill,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
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
    opacity: 0.6,
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'white',
  },
});
