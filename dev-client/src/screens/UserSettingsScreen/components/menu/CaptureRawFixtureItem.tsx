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
import Share from 'react-native-share';

import {DngDecoderHybrid} from 'dng-decoder';

import {RawCameraView} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';

// Dev-only menu row: opens the in-app RawCameraView requesting a DNG,
// then (a) runs the phase-3 decoder on a centered ROI and logs the
// resulting linear-sRGB triple to Metro, and (b) pops the platform
// share sheet so the tester can AirDrop the DNG off-device.
// See docs/raw-camera-plan.md.
export const CaptureRawFixtureItem = () => {
  const [visible, setVisible] = useState(false);

  const openCamera = useCallback(() => setVisible(true), []);
  const closeCamera = useCallback(() => setVisible(false), []);

  const handleDng = useCallback(async (uri: string) => {
    // 1. Run the decoder on a large centered ROI so we validate the
    // iOS CIRAWFilter path end-to-end without having to inspect the
    // AirDropped file manually.
    try {
      const roi = {x: 1500, y: 1000, w: 1000, h: 1000};
      const [rgb] = await DngDecoderHybrid.decodeDngRois(uri, [roi]);
      console.log(
        `DngDecoder: ROI ${roi.x},${roi.y} ${roi.w}x${roi.h} → linear sRGB (` +
          `r=${rgb.r.toFixed(4)}, g=${rgb.g.toFixed(4)}, b=${rgb.b.toFixed(4)})`,
      );
    } catch (err) {
      console.error('DngDecoder.decodeDngRois failed:', err);
    }

    // 2. Share so the tester can AirDrop to Mac for offline inspection.
    try {
      await Share.open({
        url: uri,
        type: 'image/x-adobe-dng',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('CaptureRawFixtureItem: share failed', err);
    } finally {
      setVisible(false);
    }
  }, []);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }

  return (
    <>
      <MenuItem
        variant="default"
        icon="camera"
        label="Capture RAW fixture (dev)"
        onPress={openCamera}
      />
      <RawCameraView
        visible={visible}
        containerFormat="dng"
        onCancel={closeCamera}
        onCapture={closeCamera}
        onRawPhotoDevOnly={handleDng}
      />
    </>
  );
};
