/*
 * Copyright © 2021-2023 Technology Matters
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
  DepthDependentSoilData,
  SoilData,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  compareInterval,
  degreeToPercent,
  depthIntervalKey,
  methodEnabled,
  methodRequired,
  overlaps,
  sameDepth,
  selectToPercent,
  soilDataLabColorInput,
  soilDataSlopePercent,
  soilDataToIdInput,
  soilIdEntryDataBased,
  soilIdEntryForStatus,
  soilIdEntryLocationBased,
  soilIdKey,
} from 'terraso-mobile-client/model/soilId/soilIdFunctions';

describe('methodEnabled', () => {
  test('formats method names with the Enabled suffix', () => {
    expect(methodEnabled('soilTexture')).toBe('soilTextureEnabled');
  });
});

describe('methodRequired', () => {
  test('formats method names with the Required suffix', () => {
    expect(methodRequired('soilTexture')).toBe('soilTextureRequired');
  });
});

describe('depthIntervalKey', () => {
  test('generates a key from start and end', () => {
    expect(depthIntervalKey({start: 1, end: 2})).toEqual('1-2');
  });
});

describe('sameDepth', () => {
  test('matches identical depth intervals', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 1, end: 2}};

    expect(sameDepth(a)(b)).toBeTruthy();
  });

  test('rejects different starts', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const c = {depthInterval: {start: 10, end: 2}};

    expect(sameDepth(a)(c)).toBeFalsy();
  });

  test('rejects different ends', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const d = {depthInterval: {start: 1, end: 20}};

    expect(sameDepth(a)(d)).toBeFalsy();
  });
});

describe('overlaps', () => {
  test('accepts identical intervals', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 1, end: 2}};

    expect(overlaps(a)(b)).toBeTruthy();
  });

  test('accepts intervals overlapping at the start', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 0, end: 1.1}};

    expect(overlaps(a)(b)).toBeTruthy();
  });

  test('accepts intervals overlapping at the end', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 1.9, end: 3}};

    expect(overlaps(a)(b)).toBeTruthy();
  });

  test('rejects intervals fully before', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 2, end: 3}};

    expect(overlaps(a)(b)).toBeFalsy();
  });

  test('rejects intervals fully after', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 0, end: 1}};

    expect(overlaps(a)(b)).toBeFalsy();
  });
});

describe('compareInterval', () => {
  test('compares based on start value', () => {
    const a = {depthInterval: {start: 0, end: 2}};
    const b = {depthInterval: {start: -1, end: 2}};
    const c = {depthInterval: {start: 1, end: 2}};

    expect(compareInterval(a, b)).toBeGreaterThan(0);
    expect(compareInterval(a, a)).toEqual(0);
    expect(compareInterval(a, c)).toBeLessThan(0);
  });

  test('can be used to sort intervals', () => {
    const a = {depthInterval: {start: 0, end: 2}};
    const b = {depthInterval: {start: -1, end: 2}};
    const c = {depthInterval: {start: 1, end: 2}};

    const sorted = [c, b, a].sort(compareInterval);

    expect(sorted).toEqual([b, a, c]);
  });
});

describe('degreeToPercent', () => {
  test('performs the calculation', () => {
    expect(degreeToPercent(0)).toEqual(0);
    expect(degreeToPercent(45)).toEqual(100);
    expect(degreeToPercent(60)).toEqual(173);
  });
});

describe('selectToPercent', () => {
  test('maps all values', () => {
    expect(selectToPercent('FLAT')).toEqual(0.0);
    expect(selectToPercent('GENTLE')).toEqual(2);
    expect(selectToPercent('HILLY')).toEqual(15);
    expect(selectToPercent('MODERATE')).toEqual(5);
    expect(selectToPercent('MODERATELY_STEEP')).toEqual(50);
    expect(selectToPercent('ROLLING')).toEqual(10);
    expect(selectToPercent('STEEP')).toEqual(30);
    expect(selectToPercent('STEEPEST')).toEqual(100);
    expect(selectToPercent('VERY_STEEP')).toEqual(60);
  });
});

describe('soilDataSlopePercent', () => {
  let data: SoilData;

  beforeEach(() => {
    data = {
      slopeSteepnessPercent: undefined,
      slopeSteepnessDegree: undefined,
      slopeSteepnessSelect: undefined,
    } as SoilData;
  });

  test('handles percentages', () => {
    data.slopeSteepnessPercent = 100;
    expect(soilDataSlopePercent(data)).toEqual(100);
  });

  test('handles degrees', () => {
    data.slopeSteepnessDegree = 45;
    expect(soilDataSlopePercent(data)).toEqual(100);
  });

  test('handles selections', () => {
    data.slopeSteepnessSelect = 'VERY_STEEP';
    expect(soilDataSlopePercent(data)).toEqual(60);
  });
});

describe('soilDataLabColorInput', () => {
  let data: DepthDependentSoilData;

  beforeEach(() => {
    data = {
      colorHue: undefined,
      colorValue: undefined,
      colorChroma: undefined,
    } as DepthDependentSoilData;
  });

  test('handles missing values', () => {
    expect(soilDataLabColorInput(data)).toBeUndefined();

    data.colorHue = 1;
    expect(soilDataLabColorInput(data)).toBeUndefined();

    data.colorValue = 1;
    expect(soilDataLabColorInput(data)).toBeUndefined();

    data.colorChroma = 1;
    expect(soilDataLabColorInput(data)).toBeDefined();
  });

  test('applies the conversion math', () => {
    data.colorHue = 0.5;
    data.colorValue = 0.5;
    data.colorChroma = 0.5;

    const {L, A, B} = soilDataLabColorInput(data)!;
    expect(L).toBeCloseTo(5.124);
    expect(A).toBeCloseTo(3.437);
    expect(B).toBeCloseTo(-0.784);
  });
});

describe('soilDataToIdInput', () => {
  let data: SoilData;

  beforeEach(() => {
    data = {
      slopeSteepnessDegree: undefined,
      slopeSteepnessPercent: undefined,
      slopeSteepnessSelect: undefined,
    } as SoilData;
  });

  test('restructures data', () => {
    data.slopeSteepnessDegree = 45;
    data.depthDependentData = [
      {
        depthInterval: {start: 1, end: 2},
        colorHue: 0,
        colorValue: 0,
        colorChroma: 0,
        rockFragmentVolume: 'VOLUME_0_1',
        texture: 'CLAY',
      },
    ];
    expect(soilDataToIdInput(data)).toEqual({
      depthDependentData: [
        {
          depthInterval: {start: 1, end: 2},
          colorLAB: {L: 0, A: 0, B: 0},
          rockFragmentVolume: 'VOLUME_0_1',
          texture: 'CLAY',
        },
      ],
      slope: 100,
    });
  });
});

describe('soilIdKey', () => {
  test('produces keys for coords and sites', () => {
    expect(soilIdKey({longitude: 1, latitude: 2}, 'abc')).toBe('(1, 2) abc');
  });

  test('produces keys for coords', () => {
    expect(soilIdKey({longitude: 1, latitude: 2})).toBe('(1, 2) ');
  });
});

describe('soilIdEntryForStatus', () => {
  test('produces an entry with the given status and empty matches', () => {
    expect(soilIdEntryForStatus('ready')).toEqual({
      status: 'ready',
      dataBasedMatches: undefined,
      locationBasedMatches: undefined,
    });
  });
});

describe('soilIdEntryLocationBased', () => {
  test('produces an entry with ready status and the given matches', () => {
    expect(soilIdEntryLocationBased(['match'] as any)).toEqual({
      status: 'ready',
      dataBasedMatches: undefined,
      locationBasedMatches: ['match'],
    });
  });
});

describe('soilIdEntryDataBased', () => {
  test('produces an entry with ready status and the given matches', () => {
    expect(soilIdEntryDataBased(['match'] as any)).toEqual({
      status: 'ready',
      dataBasedMatches: ['match'],
      locationBasedMatches: undefined,
    });
  });
});
