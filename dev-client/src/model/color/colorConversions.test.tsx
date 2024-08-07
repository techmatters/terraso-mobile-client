/*
 * Copyright © 2024 Technology Matters
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
  fullMunsellColor,
  isColorComplete,
  LABToMunsell,
  munsellHVCToLAB,
  munsellToRGB,
} from 'terraso-mobile-client/model/color/colorConversions';

describe('isColorComplete', () => {
  test('returns true if complete', () => {
    expect(
      isColorComplete({
        colorHue: 1,
        colorValue: 2,
        colorChroma: 3,
      }),
    ).toEqual(true);
  });

  test('returns false if value is missing any number', () => {
    expect(isColorComplete({})).toEqual(false);

    expect(
      isColorComplete({
        colorHue: 1,
        colorValue: null,
        colorChroma: null,
      }),
    ).toEqual(false);

    expect(
      isColorComplete({
        colorHue: null,
        colorValue: 1,
        colorChroma: null,
      }),
    ).toEqual(false);

    expect(
      isColorComplete({
        colorHue: null,
        colorValue: null,
        colorChroma: 1,
      }),
    ).toEqual(false);
  });
});

describe('fullMunsellColor', () => {
  test('returns the color if complete', () => {
    expect(
      fullMunsellColor({
        colorHue: 1,
        colorValue: 2,
        colorChroma: 3,
      }),
    ).toEqual({
      colorHue: 1,
      colorValue: 2,
      colorChroma: 3,
    });
  });

  test('returns undefined if value is missing any number', () => {
    expect(fullMunsellColor({})).toBeUndefined();

    expect(
      fullMunsellColor({
        colorHue: 1,
        colorValue: null,
        colorChroma: null,
      }),
    ).toBeUndefined();

    expect(
      fullMunsellColor({
        colorHue: null,
        colorValue: 1,
        colorChroma: null,
      }),
    ).toBeUndefined();

    expect(
      fullMunsellColor({
        colorHue: null,
        colorValue: null,
        colorChroma: 1,
      }),
    ).toBeUndefined();
  });
});

describe('munsellToRGB', () => {
  it('does the magic math', () => {
    const result = munsellToRGB({
      colorHue: 0.5,
      colorValue: 0.5,
      colorChroma: 0.5,
    });
    expect(result[0]).toBeCloseTo(22);
    expect(result[1]).toBeCloseTo(15);
    expect(result[2]).toBeCloseTo(19);
  });
});

describe('munsellHVCToLAB', () => {
  it('does the magic math', () => {
    const result = munsellHVCToLAB([0.5, 0.5, 0.5]);
    expect(result.L).toBeCloseTo(5.123);
    expect(result.A).toBeCloseTo(3.437);
    expect(result.B).toBeCloseTo(-0.784);
  });
});

describe('LABToMunsell', () => {
  it('does the magic math', () => {
    const result = LABToMunsell({L: 5.123, A: 3.437, B: -0.784});
    expect(result.colorHue).toBeCloseTo(0.5);
    expect(result.colorValue).toBeCloseTo(0.5);
    expect(result.colorChroma).toBeCloseTo(0.5);
  });
});
