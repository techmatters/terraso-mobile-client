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
import {Alert} from 'react-native';

import {useIsFocused} from '@react-navigation/native';

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {SimpleRawCamera} from 'terraso-mobile-client/components/inputs/image/SimpleRawCamera';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

/**
 * Dev-only full-screen RAW capture smoke test. Presented as its own navigation
 * screen (not an in-tree overlay) so the opening tap completes on the previous
 * screen and can't leak into the shutter. Captures a DNG, decodes a centre ROI,
 * alerts the resulting linear RGB, and pops back. Reached only via the
 * flag-gated dev menu item (RawCaptureTestItem).
 */
export function RawCaptureTestScreen() {
  const navigation = useNavigation();
  // Deactivate the camera when the screen loses focus (e.g. after goBack).
  const isFocused = useIsFocused();

  const onCapture = useCallback(
    async (result: CaptureResult) => {
      navigation.goBack();
      if (result.kind !== 'raw') {
        Alert.alert(
          'Unexpected capture',
          `Expected a RAW result, got "${result.kind}".`,
        );
        return;
      }
      try {
        // Centre 20% box in full-sensor pixel coords (the space decodeRoi
        // expects — see captureTypes / DngDecoder RoiPx). Dimensions shown so
        // the ROI coordinate space can be sanity-checked.
        const roi = {
          x: Math.round(result.width * 0.4),
          y: Math.round(result.height * 0.4),
          w: Math.round(result.width * 0.2),
          h: Math.round(result.height * 0.2),
        };
        const {r, g, b} = await result.decodeRoi(roi);
        Alert.alert(
          'RAW centre ROI — linear RGB',
          `sensor ${result.width}×${result.height}\n` +
            `roi x${roi.x} y${roi.y} ${roi.w}×${roi.h}\n\n` +
            `r ${r.toFixed(4)}\ng ${g.toFixed(4)}\nb ${b.toFixed(4)}`,
        );
      } catch (err) {
        Alert.alert('Decode failed', String(err));
      } finally {
        result.dispose();
      }
    },
    [navigation],
  );

  const onCancel = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SimpleRawCamera
      visible={isFocused}
      onCapture={onCapture}
      onCancel={onCancel}
    />
  );
}
