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
  Maybe,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
  SoilIdDepthDependentSoilDataCarbonatesChoices,
  SoilIdDepthDependentSoilDataColorPhotoLightingConditionChoices,
  SoilIdDepthDependentSoilDataColorPhotoSoilConditionChoices,
  SoilIdDepthDependentSoilDataConductivityTestChoices,
  SoilIdDepthDependentSoilDataConductivityUnitChoices,
  SoilIdDepthDependentSoilDataPhTestingMethodChoices,
  SoilIdDepthDependentSoilDataPhTestingSolutionChoices,
  SoilIdDepthDependentSoilDataRockFragmentVolumeChoices,
  SoilIdDepthDependentSoilDataSoilOrganicCarbonTestingChoices,
  SoilIdDepthDependentSoilDataSoilOrganicMatterTestingChoices,
  SoilIdDepthDependentSoilDataStructureChoices,
  SoilIdDepthDependentSoilDataTextureChoices,
  SoilIdSoilDataCrossSlopeChoices,
  SoilIdSoilDataDepthIntervalPresetChoices,
  SoilIdSoilDataFloodingSelectChoices,
  SoilIdSoilDataGrazingSelectChoices,
  SoilIdSoilDataLandCoverSelectChoices,
  SoilIdSoilDataLimeRequirementsSelectChoices,
  SoilIdSoilDataSlopeLandscapePositionChoices,
  SoilIdSoilDataSlopeSteepnessSelectChoices,
  SoilIdSoilDataSoilDepthSelectChoices,
  SoilIdSoilDataSurfaceCracksSelectChoices,
  SoilIdSoilDataSurfaceSaltSelectChoices,
  SoilIdSoilDataSurfaceStoninessSelectChoices,
  SoilIdSoilDataWaterTableDepthSelectChoices,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import {
  DepthDependentSoilData,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdTypes';

/* TODO: only transfer fields based on change records */

export const sync = async (
  dirty: Record<string, SoilData>,
): Promise<Record<string, SoilData>> => {
  const results: Record<string, SoilData> = {};
  for (const [siteId, soilData] of Object.entries(dirty)) {
    results[siteId] = await syncSoilData(siteId, soilData);
  }
  return results;
};

export const syncSoilData = async (
  siteId: string,
  soilData: SoilData,
): Promise<SoilData> => {
  let finalResult = await soilDataService.updateSoilData(
    localDataToMutation(siteId, soilData),
  );
  for (const depthInterval of soilData.depthIntervals) {
    finalResult = await soilDataService.updateSoilDataDepthInterval(
      localDataToDepthIntervalMutation(siteId, depthInterval),
    );
  }
  for (const data of soilData.depthDependentData) {
    finalResult = await soilDataService.updateDepthDependentSoilData(
      localDataToDepthDependentMutation(siteId, data),
    );
  }
  return finalResult;
};

export const localDataToMutation = (
  siteId: string,
  data: SoilData,
): SoilDataUpdateMutationInput => {
  return {
    siteId: siteId,
    bedrock: data.bedrock,
    crossSlope: data.crossSlope as Maybe<SoilIdSoilDataCrossSlopeChoices>,
    depthIntervalPreset:
      data.depthIntervalPreset as Maybe<SoilIdSoilDataDepthIntervalPresetChoices>,
    downSlope: data.downSlope as Maybe<SoilIdSoilDataCrossSlopeChoices>,
    floodingSelect:
      data.floodingSelect as Maybe<SoilIdSoilDataFloodingSelectChoices>,
    grazingSelect:
      data.grazingSelect as Maybe<SoilIdSoilDataGrazingSelectChoices>,
    landCoverSelect:
      data.landCoverSelect as Maybe<SoilIdSoilDataLandCoverSelectChoices>,
    limeRequirementsSelect:
      data.limeRequirementsSelect as Maybe<SoilIdSoilDataLimeRequirementsSelectChoices>,
    slopeAspect: data.slopeAspect,
    slopeLandscapePosition:
      data.slopeLandscapePosition as Maybe<SoilIdSoilDataSlopeLandscapePositionChoices>,
    slopeSteepnessDegree: data.slopeSteepnessDegree,
    slopeSteepnessPercent: data.slopeSteepnessPercent,
    slopeSteepnessSelect:
      data.slopeSteepnessSelect as Maybe<SoilIdSoilDataSlopeSteepnessSelectChoices>,
    soilDepthSelect:
      data.soilDepthSelect as Maybe<SoilIdSoilDataSoilDepthSelectChoices>,
    surfaceCracksSelect:
      data.surfaceCracksSelect as Maybe<SoilIdSoilDataSurfaceCracksSelectChoices>,
    surfaceSaltSelect:
      data.surfaceSaltSelect as Maybe<SoilIdSoilDataSurfaceSaltSelectChoices>,
    surfaceStoninessSelect:
      data.surfaceStoninessSelect as Maybe<SoilIdSoilDataSurfaceStoninessSelectChoices>,
    waterTableDepthSelect:
      data.waterTableDepthSelect as Maybe<SoilIdSoilDataWaterTableDepthSelectChoices>,
  };
};

export const localDataToDepthIntervalMutation = (
  siteId: string,
  data: SoilDataDepthInterval,
): SoilDataUpdateDepthIntervalMutationInput => {
  return {
    siteId: siteId,

    carbonatesEnabled: data.carbonatesEnabled,
    depthInterval: data.depthInterval,
    electricalConductivityEnabled: data.electricalConductivityEnabled,
    label: data.label,
    phEnabled: data.phEnabled,
    sodiumAdsorptionRatioEnabled: data.sodiumAdsorptionRatioEnabled,
    soilColorEnabled: data.soilColorEnabled,
    soilOrganicCarbonMatterEnabled: data.soilOrganicCarbonMatterEnabled,
    soilStructureEnabled: data.soilStructureEnabled,
    soilTextureEnabled: data.soilTextureEnabled,
  };
};

export const localDataToDepthDependentMutation = (
  siteId: string,
  data: DepthDependentSoilData,
): DepthDependentSoilDataUpdateMutationInput => {
  return {
    siteId: siteId,

    carbonates:
      data.carbonates as Maybe<SoilIdDepthDependentSoilDataCarbonatesChoices>,
    clayPercent: data.clayPercent,
    colorChroma: data.colorChroma,
    colorHue: data.colorHue,
    colorPhotoLightingCondition:
      data.colorPhotoLightingCondition as Maybe<SoilIdDepthDependentSoilDataColorPhotoLightingConditionChoices>,
    colorPhotoSoilCondition:
      data.colorPhotoSoilCondition as Maybe<SoilIdDepthDependentSoilDataColorPhotoSoilConditionChoices>,
    colorPhotoUsed: data.colorPhotoUsed,
    colorValue: data.colorValue,
    conductivity: data.conductivity,
    conductivityTest:
      data.conductivityTest as Maybe<SoilIdDepthDependentSoilDataConductivityTestChoices>,
    conductivityUnit:
      data.conductivityUnit as Maybe<SoilIdDepthDependentSoilDataConductivityUnitChoices>,
    depthInterval: data.depthInterval,
    ph: data.ph,
    phTestingMethod:
      data.phTestingMethod as Maybe<SoilIdDepthDependentSoilDataPhTestingMethodChoices>,
    phTestingSolution:
      data.phTestingSolution as Maybe<SoilIdDepthDependentSoilDataPhTestingSolutionChoices>,
    rockFragmentVolume:
      data.rockFragmentVolume as Maybe<SoilIdDepthDependentSoilDataRockFragmentVolumeChoices>,
    sodiumAbsorptionRatio: data.sodiumAbsorptionRatio,
    soilOrganicCarbon: data.soilOrganicCarbon,
    soilOrganicCarbonTesting:
      data.soilOrganicCarbonTesting as Maybe<SoilIdDepthDependentSoilDataSoilOrganicCarbonTestingChoices>,
    soilOrganicMatter: data.soilOrganicMatter,
    soilOrganicMatterTesting:
      data.soilOrganicMatterTesting as Maybe<SoilIdDepthDependentSoilDataSoilOrganicMatterTestingChoices>,
    structure:
      data.structure as Maybe<SoilIdDepthDependentSoilDataStructureChoices>,
    texture: data.texture as Maybe<SoilIdDepthDependentSoilDataTextureChoices>,
  };
};
