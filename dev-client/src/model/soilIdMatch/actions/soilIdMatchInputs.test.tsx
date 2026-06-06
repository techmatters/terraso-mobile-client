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

import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  degreeToPercent,
  selectToPercent,
  soilDataSlopePercent,
  soilDataToIdInput,
} from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchInputs';

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

describe('soilDataToIdInput', () => {
  let data: SoilData;

  beforeEach(() => {
    data = {
      slopeSteepnessDegree: undefined,
      slopeSteepnessPercent: undefined,
      slopeSteepnessSelect: undefined,
    } as SoilData;
  });

  test('forwards raw Munsell as colorMunsellNumeric', () => {
    data.slopeSteepnessDegree = 45;
    data.depthDependentData = [
      {
        depthInterval: {start: 1, end: 2},
        colorHue: 17.5,
        colorValue: 5,
        colorChroma: 4,
        rockFragmentVolume: 'VOLUME_0_1',
        texture: 'CLAY',
      },
    ];
    expect(soilDataToIdInput(data)).toEqual({
      depthDependentData: [
        {
          depthInterval: {start: 1, end: 2},
          colorMunsellNumeric: {hue: 17.5, value: 5, chroma: 4},
          rockFragmentVolume: 'VOLUME_0_1',
          texture: 'CLAY',
        },
      ],
      slope: 100,
    });
  });

  test('omits colorMunsellNumeric when any Munsell coordinate is missing', () => {
    data.slopeSteepnessDegree = 45;
    data.depthDependentData = [
      {
        depthInterval: {start: 1, end: 2},
        colorHue: 17.5,
        colorValue: 5,
        // colorChroma intentionally absent
        rockFragmentVolume: 'VOLUME_0_1',
        texture: 'CLAY',
      },
    ];
    const result = soilDataToIdInput(data);
    expect(result.depthDependentData[0].colorMunsellNumeric).toBeUndefined();
  });
});
