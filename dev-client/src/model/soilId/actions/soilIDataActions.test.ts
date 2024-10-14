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

import {SoilDataUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';

import {SOIL_DATA_UPDATE_FIELDS} from 'terraso-mobile-client/model/soilId/actions/soilDataActionFields';
import {
  initializeResult,
  updateSoilData,
} from 'terraso-mobile-client/model/soilId/actions/soilDataActions';
import {
  DepthDependentSoilData,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilId/soilIdSlice';

describe('initializeResult', () => {
  test('deep-copies soil data object', () => {
    const data = soilData({
      depthIntervals: [soilDataDepthInterval()],
      depthDependentData: [depthDependentSoilData()],
    });
    expect(initializeResult(data)).toEqual(data);

    expect(initializeResult(data)).not.toBe(data);
    expect(initializeResult(data).depthDependentData).not.toBe(
      data.depthDependentData,
    );
    expect(initializeResult(data).depthDependentData[0].depthInterval).not.toBe(
      data.depthDependentData[0].depthInterval,
    );
    expect(initializeResult(data).depthIntervals).not.toBe(data.depthIntervals);
    expect(initializeResult(data).depthIntervals[0].depthInterval).not.toBe(
      data.depthIntervals[0].depthInterval,
    );
  });
});

describe('updateSoilData', () => {
  test('assigns all specified properties', () => {
    const input: SoilDataUpdateMutationInput = {
      siteId: '',

      bedrock: 10,
      crossSlope: 'CONCAVE',
      depthIntervalPreset: 'BLM',
      downSlope: 'CONCAVE',
      floodingSelect: 'FREQUENT',
      grazingSelect: 'CAMEL',
      landCoverSelect: 'BARREN',
      limeRequirementsSelect: 'HIGH',
      slopeAspect: 10,
      slopeLandscapePosition: 'ALLUVIAL_FAN',
      slopeSteepnessDegree: 10,
      slopeSteepnessPercent: 20,
      slopeSteepnessSelect: 'FLAT',
      soilDepthSelect: 'BETWEEN_50_AND_70_CM',
      surfaceCracksSelect: 'DEEP_VERTICAL_CRACKS',
      surfaceSaltSelect: 'MOST_OF_SURFACE',
      surfaceStoninessSelect: 'BETWEEN_01_AND_3',
      waterTableDepthSelect: 'BETWEEN_30_AND_45_CM',
    };
    const data = soilData();
    const result = updateSoilData(input, data);

    for (const field of SOIL_DATA_UPDATE_FIELDS) {
      expect(result[field]).toEqual(input[field]);
    }
  });

  test('only assigns defined properties', () => {
    const input: SoilDataUpdateMutationInput = {
      siteId: '',

      crossSlope: undefined,
    };
    const data = soilData({
      crossSlope: 'CONCAVE',
    });
    const result = updateSoilData(input, data);

    expect(result.crossSlope).toEqual('CONCAVE');
  });

  test('assigns null properties', () => {
    const input: SoilDataUpdateMutationInput = {
      siteId: '',

      bedrock: 10,
      crossSlope: null,
    };
    const data = soilData({
      bedrock: 5,
      crossSlope: 'CONCAVE',
    });
    const result = updateSoilData(input, data);

    expect(result.crossSlope).toBeNull();
  });

  test('assigning a depth interval preset clears depth intervals', () => {
    const input: SoilDataUpdateMutationInput = {
      siteId: '',

      depthIntervalPreset: 'NRCS',
    };
    const data = soilData({
      depthIntervalPreset: 'CUSTOM',
      depthIntervals: [soilDataDepthInterval()],
    });
    const result = updateSoilData(input, data);

    expect(result.depthIntervalPreset).toEqual('NRCS');
    expect(result.depthIntervals).toHaveLength(0);
  });

  test('does not clear depth intervals when the preset is unchanged', () => {
    const input: SoilDataUpdateMutationInput = {
      siteId: '',

      depthIntervalPreset: 'NRCS',
    };
    const data = soilData({
      depthIntervalPreset: 'NRCS',
      depthIntervals: [soilDataDepthInterval()],
    });
    const result = updateSoilData(input, data);

    expect(result.depthIntervalPreset).toEqual('NRCS');
    expect(result.depthIntervals).toHaveLength(1);
  });
});

const soilData = (input: Partial<SoilData> = {}): SoilData => {
  return {
    depthIntervalPreset: 'CUSTOM',
    depthDependentData: [],
    depthIntervals: [],
    ...input,
  };
};

const depthDependentSoilData = (
  input: Partial<DepthDependentSoilData> = {},
): DepthDependentSoilData => {
  return {
    depthInterval: {start: 1, end: 2},
    ...input,
  };
};

const soilDataDepthInterval = (
  input: Partial<SoilDataDepthInterval> = {},
): SoilDataDepthInterval => {
  return {
    label: '',
    depthInterval: {start: 1, end: 2},
    ...input,
  };
};
