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

import {LocalDatum} from 'terraso-mobile-client/persistence/localData';
import {
  LocalDepthDependentSoilData,
  LocalSoilData,
  LocalSoilDataDepthInterval,
} from 'terraso-mobile-client/persistence/model/soilData/localSoilData';

export const sync = async (
  dirty: Record<string, LocalDatum<LocalSoilData>>,
): Promise<void> => {
  for (const [key, value] of Object.entries(dirty)) {
    await soilDataService.updateSoilData(
      localDataToMutation(key, value.content),
    );
    await Promise.all(
      value.content.depthIntervals.map(interval => {
        soilDataService.updateSoilDataDepthInterval(
          localDataToDepthIntervalMutation(key, interval),
        );
      }),
    );
    await Promise.all(
      value.content.depthDependentData.map(data => {
        soilDataService.updateDepthDependentSoilData(
          localDataToDepthDependentMutation(key, data),
        );
      }),
    );
  }
};

/* TODO where is the best place to check the format of local data for validity? */

export const localDataToMutation = (
  id: string,
  data: LocalSoilData,
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
  data: LocalSoilDataDepthInterval,
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
  data: LocalDepthDependentSoilData,
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
