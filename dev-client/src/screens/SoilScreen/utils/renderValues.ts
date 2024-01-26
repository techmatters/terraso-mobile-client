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

export const renderDepthInterval = ({
  label,
  depthInterval: {start, end},
}: LabelledDepthInterval) => {
  return `${label ? `${label}: ` : ''}${start}-${end} cm`;
};

// TODO: finish this method for other inputs
export const pitMethodSummary = (
  t: TFunction,
  soilData: DepthDependentSoilData | undefined,
  method: SoilPitMethod | 'rockFragmentVolume',
): {complete: boolean; summary?: string} => {
  if (method === 'soilTexture') {
    return {
      complete: typeof soilData?.texture === 'string',
      summary: soilData?.texture
        ? t(`soil.texture.class.${soilData?.texture}`)
        : undefined,
    };
  } else if (method === 'rockFragmentVolume') {
    return {
      complete: typeof soilData?.rockFragmentVolume === 'string',
      summary: soilData?.rockFragmentVolume
        ? t(`soil.texture.rockFragment.${soilData.rockFragmentVolume}`)
        : undefined,
    };
  }
  return {complete: false};
};
