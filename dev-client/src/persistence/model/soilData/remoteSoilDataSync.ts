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

import {MMKV} from 'terraso-mobile-client/hooks/useStorage';
import {MmkvSyncRepository} from 'terraso-mobile-client/persistence/sync/mmkv/mmkvSyncRecords';
import {
  SyncRecord,
  SyncRunner,
} from 'terraso-mobile-client/persistence/sync/SyncRecords';
import {AppState} from 'terraso-mobile-client/store';

export const selectRecords = (
  currentState: AppState,
  dirty: SyncRecord[],
): Record<string, SoilData> => {
  return Object.fromEntries(
    dirty
      .map(record => record.id)
      .map(id => [id, currentState.soilId.soilData[id]!]),
  );
};

export const sync = async (dirty: Record<string, SoilData>): Promise<void> => {
  for (const [key, value] of Object.entries(dirty)) {
    await soilDataService.updateSoilData(localDataToMutation(key, value));
    await Promise.all(
      value.depthIntervals.map(interval => {
        soilDataService.updateSoilDataDepthInterval(
          localDataToDepthIntervalMutation(key, interval),
        );
      }),
    );
    await Promise.all(
      value.depthDependentData.map(data => {
        soilDataService.updateDepthDependentSoilData(
          localDataToDepthDependentMutation(key, data),
        );
      }),
    );
  }
};

export const localDataToMutation = (
  id: string,
  data: SoilData,
): SoilDataUpdateMutationInput => {
  return {
    siteId: id,
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
  id: string,
  data: SoilDataDepthInterval,
): SoilDataUpdateDepthIntervalMutationInput => {
  return {
    siteId: id,

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
  id: string,
  data: DepthDependentSoilData,
): DepthDependentSoilDataUpdateMutationInput => {
  return {
    siteId: id,

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

export const SoilDataSyncRunner = new SyncRunner<SoilData>(
  new MmkvSyncRepository('soilData', MMKV),
  selectRecords,
  sync,
);
