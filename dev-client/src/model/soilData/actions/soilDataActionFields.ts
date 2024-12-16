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
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';

/**
 * The soil data fields which are covered by the update action.
 */
export const SOIL_DATA_UPDATE_FIELDS = [
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

export type SoilDataUpdateField = (typeof SOIL_DATA_UPDATE_FIELDS)[number];

/**
 * The soil data depth interval fields which are covered by the depth interval update action.
 */
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

/**
 * The depth-dependent soil data fields which are covered by the depth-dependent soil data update action.
 */
export const DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS = [
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
  (typeof DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS)[number];
