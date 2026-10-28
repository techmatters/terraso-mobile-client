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

import {useCallback, useRef} from 'react';
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

type Rgb = {r: number; g: number; b: number};

// Sanity-check a decoded soil colour. Linear RGB is ~0..1. A plausible soil
// sample is a non-grey, non-clipped colour; flag the degenerate cases that
// almost always mean the decode (or the whole capture) went wrong:
//   - essentially black (sensor got no light / wrong ROI)
//   - essentially white / saturated (blown out)
//   - all three channels ~equal (grey placeholder, or a decode that returned
//     a single value broadcast to r=g=b)
// NOTE: only applied to the SAMPLE ROI — the reference card is meant to be
// near-neutral, so "channels ~equal" is expected there, not suspicious.
const checkSampleColor = (c: Rgb): {ok: boolean; note: string} => {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const mean = (c.r + c.g + c.b) / 3;
  if (max < 0.02) return {ok: false, note: 'all black'};
  if (max <= 1.5 && min > 0.95)
    return {ok: false, note: 'all white / saturated'};
  if ((max - min) / (mean + 1e-6) < 0.02) {
    return {ok: false, note: 'channels ~equal (grey?)'};
  }
  return {ok: true, note: 'ok'};
};

// Scale a display-fractional ROI into DNG pixel coords. The DNG decodes in
// PORTRAIT extent (CIRAWFilter honors orientation), but result.width/height
// are the pre-orientation LANDSCAPE dims — so map the display-fractional ROI
// (a fraction of the portrait sensor-aspect frame) onto the oriented dims:
// short side = width, long side = height. Portrait-locked, so min/max suffices.
const roiToPixels = (
  dims: {width: number; height: number},
  roi: FractionalRoi,
) => {
  const effW = Math.min(dims.width, dims.height);
  const effH = Math.max(dims.width, dims.height);
  return {
    x: Math.round(roi.x * effW),
    y: Math.round(roi.y * effH),
    w: Math.round(roi.w * effW),
    h: Math.round(roi.h * effH),
  };
};

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
        const ref = await result.decodeRoi(
          roiToPixels(result, DISPLAY_REF_ROI),
        );
        const sample = await result.decodeRoi(
          roiToPixels(result, DISPLAY_SAMPLE_ROI),
        );
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

  // Auto stress-test: one capture per iteration, decode the SOIL ROI, sanity-
  // check it, delete the temp DNG, and return a one-line status (with running
  // tallies) for the on-screen banner. Does NOT navigate away — the loop runs
  // until the user hits Stop/Cancel. Used to shake out the intermittent
  // Android preview-stream race.
  const suspiciousRef = useRef(0);
  const failRef = useRef(0);
  const onShot = useCallback(
    async (result: CaptureResult | null, index: number): Promise<string> => {
      if (index === 0) {
        suspiciousRef.current = 0;
        failRef.current = 0;
      }
      const tally = () =>
        `(susp ${suspiciousRef.current}, fail ${failRef.current} / ${index + 1})`;
      if (!result || result.kind !== 'raw') {
        failRef.current += 1;
        return `✗ shot ${index}: CAPTURE FAILED ${tally()}`;
      }
      try {
        const sample = await result.decodeRoi(
          roiToPixels(result, DISPLAY_SAMPLE_ROI),
        );
        const verdict = checkSampleColor(sample);
        if (!verdict.ok) suspiciousRef.current += 1;
        const mark = verdict.ok ? '✓' : '⚠';
        const soil = `r${f(sample.r)} g${f(sample.g)} b${f(sample.b)}`;
        return `${mark} shot ${index}: ${soil}${
          verdict.ok ? '' : ` — ${verdict.note}`
        } ${tally()}`;
      } catch (err) {
        failRef.current += 1;
        return `✗ shot ${index}: decode error ${String(err)} ${tally()}`;
      } finally {
        // Free the temp DNG (+JPEG) immediately — a long run captures
        // hundreds of ~24 MB files.
        result.dispose();
      }
    },
    [],
  );

  return (
    <SimpleRawCamera
      visible={isFocused}
      onCapture={onCapture}
      onCancel={onCancel}
      onShot={onShot}
    />
  );
}
