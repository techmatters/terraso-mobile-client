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

import {Row, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {munsellToString} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';
import {isColorComplete} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColorValidation';

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
    ? t('soil.depth.bounds_labelled', {label, ...params})
    : t('soil.depth.bounds', params);
};

// TODO: finish this method for other inputs
export const pitMethodSummary = (
  t: TFunction,
  soilData: DepthDependentSoilData,
  method: SoilPitMethod | 'rockFragmentVolume',
): {complete: boolean; summary?: React.ReactNode} => {
  if (soilData === undefined) {
    return {complete: false};
  }
  let summary: React.ReactNode;
  if (method === 'soilTexture' && soilData.texture) {
    summary = t(`soil.texture.class.${soilData?.texture}`);
  } else if (method === 'rockFragmentVolume' && soilData.rockFragmentVolume) {
    summary = t(`soil.texture.rock_fragment.${soilData.rockFragmentVolume}`);
  } else if (method === 'soilColor' && isColorComplete(soilData)) {
    summary = (
      <Row alignItems="center" space="sm">
        <ColorDisplay variant="sm" color={soilData} />
        <Text variant="body1">{munsellToString(soilData)}</Text>
      </Row>
    );
  }
  return {complete: summary !== undefined, summary};
};
