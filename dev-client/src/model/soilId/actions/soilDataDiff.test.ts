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
  DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS,
  DEPTH_INTERVAL_UPDATE_FIELDS,
  SOIL_DATA_UPDATE_FIELDS,
} from 'terraso-mobile-client/model/soilId/actions/soilDataActionFields';
import {
  getChangedDepthDependentData,
  getChangedDepthDependentFields,
  getChangedDepthIntervalFields,
  getChangedDepthIntervals,
  getChangedSoilDataFields,
  getDeletedDepthIntervals,
} from 'terraso-mobile-client/model/soilId/actions/soilDataDiff';
import {
  DepthDependentSoilData,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilId/soilIdSlice';

describe('soil data diff', () => {
  describe('getChangedSoilDataFields', () => {
    const someSoilData = (more?: Partial<SoilData>): SoilData => {
      return {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],

        bedrock: 1,
        crossSlope: 'CONCAVE',
        downSlope: 'CONCAVE',
        floodingSelect: 'FREQUENT',
        grazingSelect: 'CAMEL',
        landCoverSelect: 'BARREN',
        limeRequirementsSelect: 'HIGH',
        slopeAspect: 1,
        slopeLandscapePosition: 'ALLUVIAL_FAN',
        slopeSteepnessDegree: 1,
        slopeSteepnessPercent: 1,
        slopeSteepnessSelect: 'FLAT',
        soilDepthSelect: 'BETWEEN_50_AND_70_CM',
        surfaceCracksSelect: 'DEEP_VERTICAL_CRACKS',
        surfaceSaltSelect: 'MOST_OF_SURFACE',
        surfaceStoninessSelect: 'BETWEEN_01_AND_3',
        waterTableDepthSelect: 'BETWEEN_30_AND_45_CM',

        ...more,
      };
    };

    test('returns all fields when no previous record', () => {
      let curr = someSoilData();

      const changed = getChangedSoilDataFields(curr, undefined);
      for (const field of SOIL_DATA_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns all changed fields', () => {
      let curr = someSoilData();
      let prev: SoilData = {
        depthIntervalPreset: 'BLM',
        depthDependentData: [],
        depthIntervals: [],
      };

      const changed = getChangedSoilDataFields(curr, prev);
      for (const field of SOIL_DATA_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns only changed fields', () => {
      let curr = someSoilData({soilDepthSelect: 'BETWEEN_50_AND_70_CM'});
      let prev = someSoilData({
        soilDepthSelect: 'GREATER_THAN_20_LESS_THAN_50_CM',
      });

      const changed = getChangedSoilDataFields(curr, prev);
      expect(changed).toEqual({soilDepthSelect: 'BETWEEN_50_AND_70_CM'});
    });
  });

  describe('getDeletedDepthIntervals', () => {
    let curr: SoilData;
    let prev: SoilData;

    beforeEach(() => {
      curr = {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      };
      prev = {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      };
    });

    test('returns empty when no previous record', () => {
      curr.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: '', depthInterval: {start: 2, end: 3}},
      ];

      const deleted = getDeletedDepthIntervals(curr, undefined);
      expect(deleted).toEqual([]);
    });

    test('returns empty when no deleted records', () => {
      curr.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: '', depthInterval: {start: 2, end: 3}},
      ];
      prev.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: '', depthInterval: {start: 2, end: 3}},
      ];

      const deleted = getDeletedDepthIntervals(curr, undefined);
      expect(deleted).toEqual([]);
    });

    test('returns prev depth intervals when deleted', () => {
      prev.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: '', depthInterval: {start: 2, end: 3}},
      ];

      const deleted = getDeletedDepthIntervals(curr, prev);
      expect(deleted).toEqual([
        {start: 1, end: 2},
        {start: 2, end: 3},
      ]);
    });

    test('returns only deleted prev intervals', () => {
      curr.depthIntervals = [{label: '', depthInterval: {start: 2, end: 3}}];
      prev.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: '', depthInterval: {start: 2, end: 3}},
      ];

      const deleted = getDeletedDepthIntervals(curr, prev);
      expect(deleted).toEqual([{start: 1, end: 2}]);
    });
  });

  describe('getChangedDepthIntervals', () => {
    let curr: SoilData;
    let prev: SoilData;

    beforeEach(() => {
      curr = {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      };
      prev = {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      };
    });

    test('returns all depth intervals when no previous record', () => {
      curr.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: '', depthInterval: {start: 2, end: 3}},
      ];

      const changed = getChangedDepthIntervals(curr, undefined);
      expect(changed).toHaveLength(2);
      expect(changed[0].depthInterval).toEqual({start: 1, end: 2});
      expect(changed[1].depthInterval).toEqual({start: 2, end: 3});
    });

    test('returns only changed intervals', () => {
      curr.depthIntervals = [
        {label: 'changed', depthInterval: {start: 1, end: 2}},
        {label: 'old', depthInterval: {start: 2, end: 3}},
        {label: 'added', depthInterval: {start: 3, end: 4}},
      ];
      prev.depthIntervals = [
        {label: '', depthInterval: {start: 1, end: 2}},
        {label: 'old', depthInterval: {start: 2, end: 3}},
        {label: 'deleted', depthInterval: {start: 4, end: 5}},
      ];

      const changed = getChangedDepthIntervals(curr, prev);
      expect(changed).toHaveLength(2);
      expect(changed[0].depthInterval).toEqual({start: 1, end: 2});
      expect(changed[1].depthInterval).toEqual({start: 3, end: 4});
    });

    test('returns changed interval fields', () => {
      curr.depthIntervals = [
        {label: 'changed', depthInterval: {start: 1, end: 2}},
      ];
      prev.depthIntervals = [{label: '', depthInterval: {start: 1, end: 2}}];

      const changed = getChangedDepthIntervals(curr, prev);
      expect(changed).toHaveLength(1);
      expect(changed[0].changedFields).toEqual({label: 'changed'});
    });
  });

  describe('getChangedDepthIntervalFields', () => {
    const someSoilDataDi = (
      more?: Partial<SoilDataDepthInterval>,
    ): SoilDataDepthInterval => {
      return {
        depthInterval: {start: 1, end: 2},
        label: 'test',

        carbonatesEnabled: false,
        electricalConductivityEnabled: false,
        phEnabled: false,
        sodiumAdsorptionRatioEnabled: false,
        soilColorEnabled: false,
        soilOrganicCarbonMatterEnabled: false,
        soilStructureEnabled: false,
        soilTextureEnabled: false,

        ...more,
      };
    };

    test('returns all fields when no previous record', () => {
      let curr = someSoilDataDi();

      const changed = getChangedDepthIntervalFields(curr, undefined);
      for (const field of DEPTH_INTERVAL_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns all changed fields', () => {
      let curr = someSoilDataDi();
      let prev: SoilDataDepthInterval = {
        depthInterval: {start: 1, end: 2},
        label: '',
      };

      const changed = getChangedDepthIntervalFields(curr, prev);
      for (const field of DEPTH_INTERVAL_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns only changed fields', () => {
      let curr = someSoilDataDi({label: 'a'});
      let prev = someSoilDataDi({label: 'b'});

      const changed = getChangedDepthIntervalFields(curr, prev);
      expect(changed).toEqual({label: 'a'});
    });
  });

  describe('getChangedDepthDependentData', () => {
    let curr: SoilData;
    let prev: SoilData;

    beforeEach(() => {
      curr = {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      };
      prev = {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      };
    });

    test('returns all data when no previous record', () => {
      curr.depthDependentData = [
        {depthInterval: {start: 1, end: 2}},
        {depthInterval: {start: 2, end: 3}},
      ];

      const changed = getChangedDepthDependentData(curr, undefined);
      expect(changed).toHaveLength(2);
      expect(changed[0].depthInterval).toEqual({start: 1, end: 2});
      expect(changed[1].depthInterval).toEqual({start: 2, end: 3});
    });

    test('returns only changed data', () => {
      curr.depthDependentData = [
        {ph: 1, depthInterval: {start: 1, end: 2}},
        {ph: 2, depthInterval: {start: 2, end: 3}},
        {ph: 3, depthInterval: {start: 3, end: 4}},
      ];
      prev.depthDependentData = [
        {ph: 0, depthInterval: {start: 1, end: 2}},
        {ph: 2, depthInterval: {start: 2, end: 3}},
      ];

      const changed = getChangedDepthDependentData(curr, prev);
      expect(changed).toHaveLength(2);
      expect(changed[0].depthInterval).toEqual({start: 1, end: 2});
      expect(changed[1].depthInterval).toEqual({start: 3, end: 4});
    });

    test('returns changed data fields', () => {
      curr.depthDependentData = [{ph: 1, depthInterval: {start: 1, end: 2}}];
      prev.depthDependentData = [{ph: 0, depthInterval: {start: 1, end: 2}}];

      const changed = getChangedDepthDependentData(curr, prev);
      expect(changed).toHaveLength(1);
      expect(changed[0].changedFields).toEqual({ph: 1});
    });
  });

  describe('getChangedDepthDependentFields', () => {
    const someSoilDataDi = (
      more?: Partial<DepthDependentSoilData>,
    ): DepthDependentSoilData => {
      return {
        depthInterval: {start: 1, end: 2},

        carbonates: 'NONEFFERVESCENT',
        clayPercent: 1,
        colorChroma: 0.1,
        colorHue: 0.1,
        colorPhotoLightingCondition: 'EVEN',
        colorPhotoSoilCondition: 'DRY',
        colorPhotoUsed: false,
        colorValue: 0.1,
        conductivity: 0.1,
        conductivityTest: 'OTHER',
        conductivityUnit: 'DECISIEMENS_METER',
        ph: 0.1,
        phTestingMethod: 'INDICATOR_SOLUTION',
        phTestingSolution: 'OTHER',
        rockFragmentVolume: 'VOLUME_0_1',
        sodiumAbsorptionRatio: 0.1,
        soilOrganicCarbon: 0.1,
        soilOrganicCarbonTesting: 'DRY_COMBUSTION',
        soilOrganicMatter: 0.1,
        soilOrganicMatterTesting: 'DRY_COMBUSTION',
        structure: 'ANGULAR_BLOCKY',
        texture: 'CLAY',

        ...more,
      };
    };

    test('returns all fields when no previous record', () => {
      let curr = someSoilDataDi();

      const changed = getChangedDepthDependentFields(curr, undefined);
      for (const field of DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns all changed fields', () => {
      let curr = someSoilDataDi();
      let prev: DepthDependentSoilData = {
        depthInterval: {start: 1, end: 2},
      };

      const changed = getChangedDepthDependentFields(curr, prev);
      for (const field of DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns only changed fields', () => {
      let curr = someSoilDataDi({texture: 'CLAY'});
      let prev = someSoilDataDi({texture: 'CLAY_LOAM'});

      const changed = getChangedDepthDependentFields(curr, prev);
      expect(changed).toEqual({texture: 'CLAY'});
    });
  });
});
