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
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  DEPTH_INTERVAL_UPDATE_FIELDS,
  SOIL_DATA_UPDATE_FIELDS,
} from 'terraso-mobile-client/model/soilId/actions/soilDataActionFields';
import {
  deleteSoilDataDepthInterval,
  initializeResult,
  updateSoilData,
  updateSoilDataDepthInterval,
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

describe('deleteSoilDataDepthInterval', () => {
  test('deletes the specified depth interval', () => {
    const input: SoilDataDeleteDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 1, end: 2},
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 0, end: 1}}),
        soilDataDepthInterval({depthInterval: {start: 1, end: 2}}),
        soilDataDepthInterval({depthInterval: {start: 2, end: 3}}),
      ],
    });

    const result = deleteSoilDataDepthInterval(input, data);
    expect(result.depthIntervals).toHaveLength(2);
    expect(result.depthIntervals[1].depthInterval).toEqual({start: 2, end: 3});
  });

  test('fails if a match not found', () => {
    const input: SoilDataDeleteDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 1, end: 2},
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 0, end: 1}}),
      ],
    });

    expect(() => deleteSoilDataDepthInterval(input, data)).toThrow();
  });
});

describe('updateSoilDataDepthInterval', () => {
  test('assigns all specified properties', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 1, end: 2},
      carbonatesEnabled: true,
      electricalConductivityEnabled: true,
      label: 'test',
      phEnabled: true,
      sodiumAdsorptionRatioEnabled: true,
      soilColorEnabled: true,
      soilOrganicCarbonMatterEnabled: true,
      soilStructureEnabled: true,
      soilTextureEnabled: true,
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 1, end: 2}}),
      ],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals).toHaveLength(1);
    for (const field of DEPTH_INTERVAL_UPDATE_FIELDS) {
      expect(result.depthIntervals[0][field]).toEqual(input[field]);
    }
  });

  test('adds a new depth interval if missing', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 2, end: 3},
      label: 'test',
    };
    const data = soilData({
      depthIntervals: [],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals).toHaveLength(1);
    expect(result.depthIntervals[0].depthInterval).toEqual({start: 2, end: 3});
    expect(result.depthIntervals[0].label).toEqual('test');
  });

  test('adds a new depth interval with default empty label', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 2, end: 3},
    };
    const data = soilData({
      depthIntervals: [],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals).toHaveLength(1);
    expect(result.depthIntervals[0].label).toEqual('');
  });

  test('applies to apply-to-intervals values', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 2, end: 3},
      applyToIntervals: [{start: 4, end: 5}],
      phEnabled: true,
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 1, end: 2}}),
        soilDataDepthInterval({depthInterval: {start: 2, end: 3}}),
        soilDataDepthInterval({depthInterval: {start: 3, end: 4}}),
        soilDataDepthInterval({depthInterval: {start: 4, end: 5}}),
      ],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals[0].phEnabled).toBeUndefined();
    expect(result.depthIntervals[1].phEnabled).toBe(true);
    expect(result.depthIntervals[2].phEnabled).toBeUndefined();
    expect(result.depthIntervals[3].phEnabled).toBe(true);
  });

  test('does not include label to apply-to-intervals', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 2, end: 3},
      applyToIntervals: [{start: 4, end: 5}],
      label: 'test',
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 2, end: 3}}),
        soilDataDepthInterval({depthInterval: {start: 4, end: 5}}),
      ],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals[0].label).toEqual('test');
    expect(result.depthIntervals[1].label).toEqual('');
  });

  test('creates intervals specified by apply-to-intervals', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 2, end: 3},
      applyToIntervals: [{start: 4, end: 5}],
      phEnabled: true,
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 2, end: 3}}),
      ],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals).toHaveLength(2);
    expect(result.depthIntervals[1].depthInterval).toEqual({start: 4, end: 5});
    expect(result.depthIntervals[1].phEnabled).toBe(true);
  });

  test('sorts newly-created intervals', () => {
    const input: SoilDataUpdateDepthIntervalMutationInput = {
      siteId: '',
      depthInterval: {start: 2, end: 3},
      applyToIntervals: [{start: 1, end: 2}],
    };
    const data = soilData({
      depthIntervals: [
        soilDataDepthInterval({depthInterval: {start: 4, end: 5}}),
      ],
    });
    const result = updateSoilDataDepthInterval(input, data);

    expect(result.depthIntervals).toHaveLength(3);
    expect(result.depthIntervals[0].depthInterval).toEqual({start: 1, end: 2});
    expect(result.depthIntervals[1].depthInterval).toEqual({start: 2, end: 3});
    expect(result.depthIntervals[2].depthInterval).toEqual({start: 4, end: 5});
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
