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

import {useCallback} from 'react';
import {Alert, Platform} from 'react-native';
import Share from 'react-native-share';

import {DngDecoderHybrid} from 'dng-decoder';
import {RawCameraAndroidHybrid} from 'raw-camera-android';

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';

// Phase-7.1 test entry: triggers the new HybridRawCameraAndroid blind
// (no preview UI) — camera is bound to ProcessLifecycleOwner and shoots
// whatever it's pointed at. Runs decodeDngRois on a centered ROI so
// Metro logs show a plausible linear-sRGB triple end-to-end, then pops
// the share sheet so the tester can AirDrop / save the DNG for offline
// inspection. Android-only; hidden in production.
export const CaptureAndroidRawItem = () => {
  const runCapture = useCallback(async () => {
    try {
      console.log('CaptureAndroidRawItem: triggering capturePhoto…');
      const {dngPath, width, height} =
        await RawCameraAndroidHybrid.capturePhoto({});
      console.log(
        `CaptureAndroidRawItem: captured DNG at ${dngPath} (${width}x${height})`,
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
          `CaptureAndroidRawItem: ROI ${roi.x},${roi.y} ${roi.w}x${roi.h} → ` +
            `linear sRGB (r=${rgb.r.toFixed(4)}, g=${rgb.g.toFixed(4)}, ` +
            `b=${rgb.b.toFixed(4)})`,
        );
      } catch (err) {
        console.error('CaptureAndroidRawItem: decode failed:', err);
      }

      try {
        await Share.open({
          url: dngPath,
          type: 'image/x-adobe-dng',
          failOnCancel: false,
        });
      } catch (err) {
        console.error('CaptureAndroidRawItem: share failed:', err);
      }
    } catch (err) {
      console.error('CaptureAndroidRawItem: capture failed:', err);
      Alert.alert('Android RAW capture failed', String(err));
    }
  }, []);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="camera"
      label="Capture Android RAW (dev, blind)"
      onPress={runCapture}
    />
  );
};
