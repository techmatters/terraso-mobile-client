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

import {
  correctSampleRGB,
  linearToSrgb,
  srgbToLinear,
} from 'terraso-mobile-client/model/color/colorDetection';
import {RGB} from 'terraso-mobile-client/model/color/types';

describe('srgbToLinear', () => {
  test('anchors: 0 → 0, 255 → 1', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 6);
  });

  test('linear piece for very-dark values', () => {
    // Below the 0.04045 threshold on the sRGB curve, the transfer function is
    // exactly c/12.92 (a straight line). Concretely: sRGB 10/255 → 10/(255*12.92).
    expect(srgbToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 8);
  });

  test('gamma piece for mid-tones', () => {
    // Middle-grey sRGB 128 should be roughly 0.216 in linear (≈ 21.6% reflectance).
    expect(srgbToLinear(128)).toBeCloseTo(0.21586, 4);
  });
});

describe('linearToSrgb', () => {
  test('anchors: 0 → 0, 1 → 255', () => {
    expect(linearToSrgb(0)).toBe(0);
    expect(linearToSrgb(1)).toBe(255);
  });

  test('clamps values outside [0, 1]', () => {
    expect(linearToSrgb(-0.5)).toBe(0);
    expect(linearToSrgb(1.5)).toBe(255);
    expect(linearToSrgb(100)).toBe(255);
  });

  test('roundtrip srgb → linear → srgb is within ±1 for all 8-bit values', () => {
    // Rounding at the final `* 255` step means we tolerate a 1-count drift.
    for (let c = 0; c <= 255; c++) {
      const roundtripped = linearToSrgb(srgbToLinear(c));
      expect(Math.abs(roundtripped - c)).toBeLessThanOrEqual(1);
    }
  });
});

describe('correctSampleRGB', () => {
  test('identity: when the card matches the reference, the sample is returned essentially unchanged', () => {
    const card: RGB = [200, 200, 200];
    const sample: RGB = [120, 80, 40];
    const reference: RGB = [200, 200, 200];
    const [r, g, b] = correctSampleRGB(card, sample, reference);
    // Small drift is expected from linear ↔ sRGB rounding.
    expect(Math.abs(r - 120)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - 80)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - 40)).toBeLessThanOrEqual(1);
  });

  test('clamps output to [0, 255] even under aggressive gain', () => {
    const card: RGB = [10, 10, 10];
    const sample: RGB = [200, 200, 200];
    const reference: RGB = [250, 250, 250];
    const result = correctSampleRGB(card, sample, reference);
    result.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
      expect(Number.isFinite(v)).toBe(true);
    });
  });

  test('handles a fully-black card without producing NaN/Infinity', () => {
    const card: RGB = [0, 0, 0];
    const sample: RGB = [100, 100, 100];
    const reference: RGB = [200, 200, 200];
    const result = correctSampleRGB(card, sample, reference);
    result.forEach(v => {
      expect(Number.isFinite(v)).toBe(true);
    });
  });

  test('gives a different result than the old sRGB-space math for a realistic warm-cast scenario', () => {
    // Reference card measured as sRGB [249.92, 242.07, 161.42] under D65
    // (CANARY_POST_IT). Under warm indoor light the camera might sense the
    // card as sRGB [200, 190, 130]. This exercises the whole non-linear
    // curve — the ratio in sRGB space is a materially different number than
    // in linear space, so the corrected sample must differ from the naive
    // sRGB-space product.
    const card: RGB = [200, 190, 130];
    const sample: RGB = [110, 90, 70];
    const reference: RGB = [249.92, 242.07, 161.42];

    const [r, g, b] = correctSampleRGB(card, sample, reference);

    const oldSrgbSpace = (cardV: number, sampleV: number, refV: number) =>
      Math.round((refV / cardV) * sampleV);
    const oldR = oldSrgbSpace(card[0], sample[0], reference[0]);
    const oldG = oldSrgbSpace(card[1], sample[1], reference[1]);
    const oldB = oldSrgbSpace(card[2], sample[2], reference[2]);

    // The linear-space correction produces a different (larger, because gamma
    // stretches the highlights) number than sRGB-space scaling for every
    // channel of this scenario.
    expect(r).toBeGreaterThan(oldR);
    expect(g).toBeGreaterThan(oldG);
    expect(b).toBeGreaterThan(oldB);
  });
});
