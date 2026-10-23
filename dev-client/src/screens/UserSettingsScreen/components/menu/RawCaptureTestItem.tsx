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
import {Alert} from 'react-native';

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {SimpleRawCamera} from 'terraso-mobile-client/components/inputs/image/SimpleRawCamera';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useIsExperimentalRawColorEnabled} from 'terraso-mobile-client/model/rawColor/experimentalRawColorToggle';

// Dev-only end-to-end smoke test for the RAW pipeline: opens the minimal RAW
// camera, decodes a centre ROI from the captured DNG, and alerts the resulting
// linear RGB — proving capture → dng-decoder → colour on-device. Shown only
// when the experimental RAW-colour flag is on (toggle above). Not a product
// surface; the real colour screen comes later.
export const RawCaptureTestItem = () => {
  const enabled = useIsExperimentalRawColorEnabled();
  const [cameraVisible, setCameraVisible] = useState(false);

  const onCapture = useCallback(async (result: CaptureResult) => {
    setCameraVisible(false);
    if (result.kind !== 'raw') {
      Alert.alert(
        'Unexpected capture',
        `Expected a RAW result, got "${result.kind}".`,
      );
      return;
    }
    try {
      // Centre 20% box in full-sensor pixel coords (the space decodeRoi
      // expects — see captureTypes / DngDecoder RoiPx).
      const roi = {
        x: Math.round(result.width * 0.4),
        y: Math.round(result.height * 0.4),
        w: Math.round(result.width * 0.2),
        h: Math.round(result.height * 0.2),
      };
      const {r, g, b} = await result.decodeRoi(roi);
      Alert.alert(
        'RAW centre ROI — linear RGB',
        `r ${r.toFixed(4)}\ng ${g.toFixed(4)}\nb ${b.toFixed(4)}`,
      );
    } catch (err) {
      Alert.alert('Decode failed', String(err));
    } finally {
      result.dispose();
    }
  }, []);

  if (APP_CONFIG.environment === 'production' || !enabled) {
    return null;
  }

  return (
    <>
      <MenuItem
        variant="default"
        icon="photo-camera"
        label="RAW capture (test)"
        onPress={() => setCameraVisible(true)}
      />
      <SimpleRawCamera
        visible={cameraVisible}
        onCapture={onCapture}
        onCancel={() => setCameraVisible(false)}
      />
    </>
  );
};
