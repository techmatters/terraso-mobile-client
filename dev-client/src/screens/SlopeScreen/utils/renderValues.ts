import {TFunction} from 'i18next';
import {SoilData} from 'terraso-client-shared/soilId/soilIdSlice';

export const renderSteepness = (
  t: TFunction,
  {slopeSteepnessDegree, slopeSteepnessPercent, slopeSteepnessSelect}: SoilData,
) =>
  slopeSteepnessSelect
    ? t(`slope.steepness.select_labels.${slopeSteepnessSelect}`)
    : typeof slopeSteepnessPercent === 'number'
      ? `${slopeSteepnessPercent.toFixed(0)}%`
      : typeof slopeSteepnessDegree === 'number'
        ? `${slopeSteepnessDegree}°`
        : undefined;

export const renderShape = (t: TFunction, {downSlope, crossSlope}: SoilData) =>
  downSlope && crossSlope
    ? `${t(`slope.shape.select_labels.${downSlope}`)} ${t(
        `slope.shape.select_labels.${crossSlope}`,
      )}`
    : undefined;
