/*
 * Copyright © 2023 Technology Matters
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

import {TFunction} from 'i18next';
import {SoilData} from 'terraso-client-shared/soilId/soilIdSlice';

export const renderSteepness = (
  t: TFunction,
  {slopeSteepnessDegree, slopeSteepnessPercent, slopeSteepnessSelect}: SoilData,
) => {
  if (slopeSteepnessSelect) {
    return renderSlopeSteepnessSelectInline(t, slopeSteepnessSelect);
  } else if (typeof slopeSteepnessPercent === 'number') {
    return renderSlopeSteepnessPercent(t, slopeSteepnessPercent);
  } else if (typeof slopeSteepnessDegree === 'number') {
    return renderSlopeSteepnessDegree(t, slopeSteepnessDegree);
  } else {
    return undefined;
  }
};

export const renderSteepnessForNarrowDisplay = (
  t: TFunction,
  {slopeSteepnessDegree, slopeSteepnessPercent, slopeSteepnessSelect}: SoilData,
) => {
  if (slopeSteepnessSelect) {
    return renderSlopeSteepnessSelectMultipleLines(t, slopeSteepnessSelect);
  } else if (typeof slopeSteepnessPercent === 'number') {
    return renderSlopeSteepnessPercent(t, slopeSteepnessPercent);
  } else if (typeof slopeSteepnessDegree === 'number') {
    return renderSlopeSteepnessDegree(t, slopeSteepnessDegree);
  } else {
    return undefined;
  }
};

export const renderSlopeSteepnessSelectInline = (
  t: TFunction,
  slopeSteepnessSelect: string,
) => {
  return (
    t(`slope.steepness.select_labels.${slopeSteepnessSelect}`) +
    ' ' +
    t(`slope.steepness.select_labels.${slopeSteepnessSelect}_PERCENT`)
  );
};

const renderSlopeSteepnessSelectMultipleLines = (
  t: TFunction,
  slopeSteepnessSelect: string,
) => {
  return (
    t(`slope.steepness.select_labels.${slopeSteepnessSelect}`) +
    '\n' +
    t(`slope.steepness.select_labels.${slopeSteepnessSelect}_PERCENT`)
  );
};

const renderSlopeSteepnessPercent = (
  t: TFunction,
  slopeSteepnessPercent: number,
) => {
  return t('slope.steepness.percentage', {
    value: slopeSteepnessPercent.toFixed(0),
  });
};

const renderSlopeSteepnessDegree = (
  t: TFunction,
  slopeSteepnessDegree: number,
) => {
  return t('slope.steepness.degree', {
    value: slopeSteepnessDegree.toFixed(0),
  });
};

export const renderShape = (
  t: TFunction,
  {downSlope, crossSlope}: Pick<SoilData, 'downSlope' | 'crossSlope'>,
) =>
  downSlope && crossSlope
    ? `${t(`slope.shape.select_labels.${downSlope}`)} ${t(
        `slope.shape.select_labels.${crossSlope}`,
      )}`
    : undefined;
