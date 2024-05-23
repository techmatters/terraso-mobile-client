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
  DepthInterval,
  SoilIdDepthDependentData,
  SoilIdDepthDependentSoilDataRockFragmentVolumeChoices,
  SoilIdDepthDependentSoilDataTextureChoices,
  SoilIdSoilData,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {sameDepth} from 'terraso-client-shared/soilId/soilIdSlice';
import {
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {
  fullMunsellColor,
  munsellToString,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';

export type SoilPropertiesDataTableRow = {
  depth: DepthInterval;
  texture?: SoilIdDepthDependentSoilDataTextureChoices;
  rockFragment?: SoilIdDepthDependentSoilDataRockFragmentVolumeChoices;
  munsellColor?: string;
};

export const rowsFromSoilData = (
  data: SoilData,
): SoilPropertiesDataTableRow[] => {
  return data.depthIntervals.map(interval => rowFromSoilData(data, interval));
};

export const rowFromSoilData = (
  data: SoilData,
  interval: SoilDataDepthInterval,
): SoilPropertiesDataTableRow => {
  const dataForInterval = data.depthDependentData.find(sameDepth(interval));

  const color =
    dataForInterval &&
    fullMunsellColor({
      colorHue: dataForInterval.colorHue,
      colorChroma: dataForInterval.colorChroma,
      colorValue: dataForInterval.colorValue,
    });
  return {
    depth: interval.depthInterval,
    texture: dataForInterval?.texture ?? undefined,
    rockFragment: dataForInterval?.rockFragmentVolume ?? undefined,
    munsellColor: color ? munsellToString(color) : undefined,
  };
};

export const rowsFromSoilIdData = (
  data: SoilIdSoilData,
): SoilPropertiesDataTableRow[] => {
  return data.depthDependentData.map(d => rowFromSoilIdData(d));
};

export const rowFromSoilIdData = (
  data: SoilIdDepthDependentData,
): SoilPropertiesDataTableRow => {
  return {
    depth: data.depthInterval,
    texture: data.texture ?? undefined,
    rockFragment: data.rockFragmentVolume ?? undefined,
    munsellColor: data.munsellColorString ?? undefined,
  };
};
