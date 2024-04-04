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
import {
  DepthDependentSoilData,
  LabelledDepthInterval,
  SoilPitMethod,
} from 'terraso-client-shared/soilId/soilIdSlice';
import {munsellToString} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';

export const renderDepthInterval = (
  t: TFunction,
  {label, depthInterval: {start, end}}: LabelledDepthInterval,
) => {
  const params = {
    start,
    end,
    units: 'cm',
  };

  return label
    ? t('soil.depth_interval.bounds_labelled', {label, ...params})
    : t('soil.depth_interval.bounds', params);
};

// TODO: finish this method for other inputs
export const pitMethodSummary = (
  t: TFunction,
  soilData: DepthDependentSoilData | undefined,
  method: SoilPitMethod | 'rockFragmentVolume',
): {complete: boolean; summary?: string} => {
  if (soilData === undefined) {
    return {complete: false};
  }
  let summary: string | undefined;
  if (method === 'soilTexture' && soilData.texture) {
    summary = t(`soil.texture.class.${soilData?.texture}`);
  } else if (method === 'rockFragmentVolume' && soilData.rockFragmentVolume) {
    summary = t(`soil.texture.rockFragment.${soilData.rockFragmentVolume}`);
  } else if (
    method === 'soilColor' &&
    typeof soilData.colorHue === 'number' &&
    typeof soilData.colorValue === 'number' &&
    typeof soilData.colorChroma === 'number'
  ) {
    summary = munsellToString({
      colorHue: soilData.colorHue,
      colorValue: soilData.colorValue,
      colorChroma: soilData.colorChroma,
    });
  }
  return {complete: summary !== undefined, summary};
};
