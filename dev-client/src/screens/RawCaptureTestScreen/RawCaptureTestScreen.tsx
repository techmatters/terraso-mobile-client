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
import {
  DISPLAY_REF_ROI,
  DISPLAY_SAMPLE_ROI,
  type FractionalRoi,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

const f = (n: number) => n.toFixed(3);

/**
 * Dev-only full-screen RAW capture smoke test. Presented as its own navigation
 * screen (not an in-tree overlay) so the opening tap completes on the previous
 * screen and can't leak into the shutter. On capture it decodes the same two
 * ROIs the overlay shows (reference + sample), white-balances the sample
 * against the reference, and alerts the result. Reached only via the
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
        // The DNG decodes in PORTRAIT extent (CIRAWFilter honors orientation),
        // but result.width/height are the pre-orientation LANDSCAPE dims — so
        // scale the display-fractional ROIs (which are fractions of the
        // portrait sensor-aspect frame) by the oriented dims: short side =
        // width, long side = height. Portrait-locked, so min/max suffices.
        const effW = Math.min(result.width, result.height);
        const effH = Math.max(result.width, result.height);
        const toPixels = (roi: FractionalRoi) => ({
          x: Math.round(roi.x * effW),
          y: Math.round(roi.y * effH),
          w: Math.round(roi.w * effW),
          h: Math.round(roi.h * effH),
        });
        const ref = await result.decodeRoi(toPixels(DISPLAY_REF_ROI));
        const sample = await result.decodeRoi(toPixels(DISPLAY_SAMPLE_ROI));
        // Naive white balance: divide the sample (soil) by the reference's
        // channels (assumes the ref ROI frames a neutral card), then normalize
        // so the brightest channel is 1. A real WB/Munsell pass is workstream 3.
        const eps = 1e-6;
        const wb = {
          r: sample.r / (ref.r + eps),
          g: sample.g / (ref.g + eps),
          b: sample.b / (ref.b + eps),
        };
        const wbMax = Math.max(wb.r, wb.g, wb.b) || 1;
        Alert.alert(
          'RAW ref + sample (linear RGB)',
          `REF   r ${f(ref.r)}  g ${f(ref.g)}  b ${f(ref.b)}\n` +
            `SOIL  r ${f(sample.r)}  g ${f(sample.g)}  b ${f(sample.b)}\n\n` +
            `WB soil (÷ref, normalized):\n` +
            `  r ${f(wb.r / wbMax)}  g ${f(wb.g / wbMax)}  b ${f(wb.b / wbMax)}`,
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
