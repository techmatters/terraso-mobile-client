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

export type UpdateField = (typeof UPDATE_FIELDS)[number];

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

export type DepthIntervalUpdateField =
  (typeof DEPTH_INTERVAL_UPDATE_FIELDS)[number];

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

export type DepthDependentUpdateField =
  (typeof DEPTH_DEPENDENT_UPDATE_FIELDS)[number];

export type SoilDataChangeSet = {
  fieldChanges: Record<string, FieldChange<UpdateField>>;
  depthIntervalChanges: Record<string, DepthIntervalChange>;
  depthDependentChanges: Record<string, DepthDependentChange>;
};

export const soilDataChangeSet = (): SoilDataChangeSet => {
  return {
    fieldChanges: {},
    depthIntervalChanges: {},
    depthDependentChanges: {},
  };
};

export const recordUpdateFields = (
  changes: SoilDataChangeSet,
  fieldNames: Iterable<UpdateField>,
) => {
  for (const fieldName of fieldNames) {
    changes.fieldChanges[fieldName] = {fieldName};
  }
};

export const getDepthIntervalChanges = (
  changes: SoilDataChangeSet,
  depthInterval: DepthInterval,
): DepthIntervalChange => {
  const key = depthIntervalKey(depthInterval);
  let depthIntervalChanges = changes.depthIntervalChanges[key];
  if (!depthIntervalChanges) {
    depthIntervalChanges = {
      depthInterval,
      deleted: false,
      fieldChanges: {},
    };
    changes.depthIntervalChanges[key] = depthIntervalChanges;
  }
  return depthIntervalChanges;
};

export const recordDepthIntervalUpdateFields = (
  changes: SoilDataChangeSet,
  depthInterval: DepthInterval,
  fieldNames: Iterable<DepthIntervalUpdateField>,
) => {
  const depthIntervalChanges = getDepthIntervalChanges(changes, depthInterval);
  for (const fieldName of fieldNames) {
    depthIntervalChanges.fieldChanges[fieldName] = {fieldName};
  }
};

export const recordDepthIntervalDeletion = (
  changes: SoilDataChangeSet,
  depthInterval: DepthInterval,
) => {
  changes.depthIntervalChanges[depthIntervalKey(depthInterval)] = {
    depthInterval: depthInterval,
    deleted: true,
    fieldChanges: {},
  };
};

export const getDepthDependentChanges = (
  changes: SoilDataChangeSet,
  depthInterval: DepthInterval,
): DepthDependentChange => {
  const key = depthIntervalKey(depthInterval);
  let depthDependentChanges = changes.depthDependentChanges[key];
  if (!depthDependentChanges) {
    depthDependentChanges = {
      depthInterval,
      fieldChanges: {},
    };
    changes.depthDependentChanges[key] = depthDependentChanges;
  }
  return depthDependentChanges;
};

export const recordDepthDependentUpdateFields = (
  changes: SoilDataChangeSet,
  depthInterval: DepthInterval,
  fieldNames: Iterable<DepthDependentUpdateField>,
) => {
  const depthDependentChanges = getDepthDependentChanges(
    changes,
    depthInterval,
  );
  for (const fieldName of fieldNames) {
    depthDependentChanges.fieldChanges[fieldName] = {fieldName};
  }
};

export const unifyChanges = (
  a?: SoilDataChangeSet,
  b?: SoilDataChangeSet,
): SoilDataChangeSet => {
  return {
    fieldChanges: {...a?.fieldChanges, ...b?.fieldChanges},
    depthIntervalChanges: unifyDepthIntervalChanges(
      a?.depthIntervalChanges,
      b?.depthIntervalChanges,
    ),
    depthDependentChanges: unifyDepthDependentDataChanges(
      a?.depthDependentChanges,
      b?.depthDependentChanges,
    ),
  };
};

export const unifyDepthIntervalChanges = (
  a?: Record<string, DepthIntervalChange>,
  b?: Record<string, DepthIntervalChange>,
): Record<string, DepthIntervalChange> => {
  const result = {...a};
  for (const [key, value] of Object.entries(b ?? {})) {
    if (value.deleted) {
      result[key] = value;
    } else {
      result[key] = {
        depthInterval: value.depthInterval,
        deleted: false,
        fieldChanges: {...result[key]?.fieldChanges, ...value.fieldChanges},
      };
    }
  }
  return result;
};

export const unifyDepthDependentDataChanges = (
  a?: Record<string, DepthDependentChange>,
  b?: Record<string, DepthDependentChange>,
): Record<string, DepthDependentChange> => {
  const result = {...a};
  for (const [key, value] of Object.entries(b ?? {})) {
    result[key] = {
      depthInterval: value.depthInterval,
      fieldChanges: {...result[key]?.fieldChanges, ...value.fieldChanges},
    };
  }
  return result;
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
