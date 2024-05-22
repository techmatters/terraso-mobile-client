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
  SoilIdDepthDependentData,
  SoilIdDepthDependentSoilDataRockFragmentVolumeChoices,
  SoilIdDepthDependentSoilDataTextureChoices,
  SoilIdSoilData,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  DepthDependentSoilData,
  SoilData,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {
  fullMunsellColor,
  munsellToString,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellConversions';

export type SoilPropertiesDataTableRow = {
  depth: {
    start: number;
    end: number;
  };
  texture?: SoilIdDepthDependentSoilDataTextureChoices;
  rockFragment?: SoilIdDepthDependentSoilDataRockFragmentVolumeChoices;
  munsellColor?: string;
};

export const rowsFromSoilData = (
  data: SoilData,
): SoilPropertiesDataTableRow[] => {
  return data.depthDependentData.map(d => rowFromSoilData(d));
};

export const rowFromSoilData = (
  data: DepthDependentSoilData,
): SoilPropertiesDataTableRow => {
  const color = fullMunsellColor({
    colorHue: data.colorHue,
    colorChroma: data.colorChroma,
    colorValue: data.colorValue,
  });
  return {
    depth: {
      start: data.depthInterval.start,
      end: data.depthInterval.end,
    },
    texture: data.texture ?? undefined,
    rockFragment: data.rockFragmentVolume ?? undefined,
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
    depth: {
      start: data.depthInterval.start,
      end: data.depthInterval.end,
    },
    texture: data.texture ?? undefined,
    rockFragment: data.rockFragmentVolume ?? undefined,
    munsellColor: data.munsellColorString ?? undefined,
  };
};
