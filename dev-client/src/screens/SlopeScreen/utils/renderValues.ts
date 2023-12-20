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
