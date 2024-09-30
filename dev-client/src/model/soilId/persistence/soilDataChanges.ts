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
  DepthDependentSoilDataUpdateMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  DepthDependentSoilData,
  DepthInterval,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilId/soilIdSlice';

export const UPDATE_FIELDS = [
  'bedrock',
  'crossSlope',
  'depthIntervalPreset',
  'downSlope',
  'floodingSelect',
  'grazingSelect',
  'landCoverSelect',
  'limeRequirementsSelect',
  'slopeAspect',
  'slopeLandscapePosition',
  'slopeSteepnessDegree',
  'slopeSteepnessPercent',
  'slopeSteepnessSelect',
  'soilDepthSelect',
  'surfaceCracksSelect',
  'surfaceSaltSelect',
  'surfaceStoninessSelect',
  'waterTableDepthSelect',
] as const satisfies (keyof SoilData)[] & (keyof SoilDataUpdateMutationInput)[];

export type UpdateField = typeof UPDATE_FIELDS;

export const DEPTH_INTERVAL_UPDATE_FIELDS = [
  'carbonatesEnabled',
  'electricalConductivityEnabled',
  'label',
  'phEnabled',
  'sodiumAdsorptionRatioEnabled',
  'soilColorEnabled',
  'soilOrganicCarbonMatterEnabled',
  'soilStructureEnabled',
  'soilTextureEnabled',
] as const satisfies (keyof SoilDataDepthInterval)[] &
  (keyof SoilDataUpdateDepthIntervalMutationInput)[];

export type DepthIntervalUpdateField = typeof DEPTH_INTERVAL_UPDATE_FIELDS;

export const DEPTH_DEPENDENT_UPDATE_FIELDS = [
  'carbonates',
  'clayPercent',
  'colorChroma',
  'colorHue',
  'colorPhotoLightingCondition',
  'colorPhotoSoilCondition',
  'colorPhotoUsed',
  'colorValue',
  'conductivity',
  'conductivityTest',
  'conductivityUnit',
  'ph',
  'phTestingMethod',
  'phTestingSolution',
  'rockFragmentVolume',
  'sodiumAbsorptionRatio',
  'soilOrganicCarbon',
  'soilOrganicCarbonTesting',
  'soilOrganicMatter',
  'soilOrganicMatterTesting',
  'structure',
  'texture',
] as const satisfies (keyof DepthDependentSoilData)[] &
  (keyof DepthDependentSoilDataUpdateMutationInput)[];

export type DepthDependentUpdateField = typeof DEPTH_DEPENDENT_UPDATE_FIELDS;

export type SoilDataChangeSet = {
  fieldChanges: Record<string, FieldChange<UpdateField>>;
  depthIntervalChanges: Record<string, DepthIntervalChange>;
  depthDependentDataChanges: Record<string, DepthDependentChange>;
};

export const soilDataChangeSet = (): SoilDataChangeSet => {
  return {
    fieldChanges: {},
    depthIntervalChanges: {},
    depthDependentDataChanges: {},
  };
};

export type FieldChange<T> = {
  fieldName: string & T;
};

export const gatherChangedFields = (
  fields: Record<string, FieldChange<unknown>>,
  input: any,
): Record<string, any> => {
  const mutatedFields: Record<string, any> = {};
  for (const field of Object.keys(fields)) {
    if (field in input && input[field] !== undefined)
      mutatedFields[field] = input[field];
  }
  return mutatedFields;
};

export type DepthIntervalChange = {
  depthInterval: DepthInterval;
  fieldChanges: Record<string, FieldChange<DepthIntervalUpdateField>>;
  deleted: boolean;
};

export type DepthDependentChange = {
  depthInterval: DepthInterval;
  fieldChanges: Record<string, FieldChange<DepthDependentUpdateField>>;
};

export const depthIntervalKey = (depthInterval: DepthInterval): string =>
  `[${depthInterval.start}-${depthInterval.end})`;

export const gatherDepthIntervals = (
  soilData: SoilData,
): Record<string, SoilDataDepthInterval> => {
  const result: Record<string, SoilDataDepthInterval> = {};
  soilData.depthIntervals.forEach(
    depthInterval =>
      (result[depthIntervalKey(depthInterval.depthInterval)] = depthInterval),
  );

  return result;
};

export const gatherDepthDependentData = (
  soilData: SoilData,
): Record<string, DepthDependentSoilData> => {
  const result: Record<string, DepthDependentSoilData> = {};
  soilData.depthDependentData.forEach(
    depthDependentData =>
      (result[depthIntervalKey(depthDependentData.depthInterval)] =
        depthDependentData),
  );

  return result;
};
