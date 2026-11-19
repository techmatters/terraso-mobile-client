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

import {rgb255ToMhvc} from 'munsell';

import {
  colorResultFromMhvc,
  linearToSrgb255,
  predictColorFromLinear,
  srgb255ToLinear,
} from 'terraso-mobile-client/model/color/colorDetection';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';

// Compute the result the predictor should produce for an already-corrected
// linear colour, independent of the correction step — lets the tests assert the
// white-balance math exactly without hard-coding Munsell/soil-catalog outputs.
const resultForCorrectedLinear = (c: LinearRgb) =>
  colorResultFromMhvc(
    rgb255ToMhvc(
      linearToSrgb255(c.r),
      linearToSrgb255(c.g),
      linearToSrgb255(c.b),
    ),
  );

describe('srgb255ToLinear / linearToSrgb255', () => {
  test('endpoints', () => {
    expect(srgb255ToLinear(0)).toBe(0);
    expect(srgb255ToLinear(255)).toBeCloseTo(1, 10);
  });

  test('round-trips within rounding', () => {
    for (const v of [0, 32, 64, 128, 192, 255]) {
      expect(linearToSrgb255(srgb255ToLinear(v))).toBe(v);
    }
  });

  test('is monotonic', () => {
    let prev = -1;
    for (let v = 0; v <= 255; v += 15) {
      const lin = srgb255ToLinear(v);
      expect(lin).toBeGreaterThan(prev);
      prev = lin;
    }
  });
});

describe('predictColorFromLinear', () => {
  const soil: LinearRgb = {r: 0.2, g: 0.15, b: 0.1};
  const expected: LinearRgb = {r: 0.4, g: 0.4, b: 0.4};

  test('a reference measured exactly as expected applies no correction', () => {
    // measuredReference === expected ⇒ per-channel ratio is 1 ⇒ corrected soil
    // equals the measured soil.
    expect(predictColorFromLinear(expected, soil, expected)).toEqual(
      resultForCorrectedLinear(soil),
    );
  });

  test('white-balances the soil by the reference ratio (per channel)', () => {
    // Reference measured redder than it should be ⇒ the correction scales the
    // red channel down: corrected = (expected / measuredRef) * soil.
    const measuredReference: LinearRgb = {r: 0.5, g: 0.4, b: 0.4};
    const corrected: LinearRgb = {
      r: (0.4 / 0.5) * soil.r,
      g: (0.4 / 0.4) * soil.g,
      b: (0.4 / 0.4) * soil.b,
    };
    expect(predictColorFromLinear(measuredReference, soil, expected)).toEqual(
      resultForCorrectedLinear(corrected),
    );
  });

  test('guards against a zero reference channel (no NaN)', () => {
    const measuredReference: LinearRgb = {r: 0, g: 0.4, b: 0.4};
    // r channel collapses to 0 rather than dividing by zero.
    const corrected: LinearRgb = {r: 0, g: soil.g, b: soil.b};
    expect(predictColorFromLinear(measuredReference, soil, expected)).toEqual(
      resultForCorrectedLinear(corrected),
    );
  });
});
