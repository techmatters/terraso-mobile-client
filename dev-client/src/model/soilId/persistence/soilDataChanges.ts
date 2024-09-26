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
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {
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

export const DEPTH_DEPENDENT_UPDATE_FIELDS = [
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

export type SoilDataChangeSet = {
  fieldChanges: Record<FieldKey, FieldChange>;
  depthIntervalChanges: Record<DepthIntervalKey, DepthIntervalChange>;
  depthDependentDataChanges: Record<DepthIntervalKey, DepthIntervalChange>;
};

export const soilDataChangeSet = (): SoilDataChangeSet => {
  return {
    fieldChanges: {},
    depthIntervalChanges: {},
    depthDependentDataChanges: {},
  };
};

export type FieldChange = {
  fieldName: string;
};

export type FieldKey = string;

export const fieldKey = (change: FieldChange): FieldKey => change.fieldName;

export type DepthIntervalChange = {
  depthInterval: DepthInterval;
  fieldChanges: Record<FieldKey, FieldChange>;
  deleted: boolean;
};

export type DepthIntervalKey = `[${number}-${number})`;

export const depthIntervalKey = (
  change: DepthIntervalChange,
): DepthIntervalKey =>
  `[${change.depthInterval.start}-${change.depthInterval.end})`;
