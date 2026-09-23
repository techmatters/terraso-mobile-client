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
  Maybe,
  SoilIdInputData,
  SoilIdInputDepthDependentData,
  SoilIdSoilDataSlopeSteepnessSelectChoices,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  DepthDependentSoilData,
  SoilData,
} from 'terraso-client-shared/soilId/soilIdTypes';

export const degreeToPercent = (degrees: number) =>
  Math.round(Math.tan((degrees * Math.PI) / 180) * 100);

// For a categorical slope the soil-ID query needs one representative percent. We
// use the class midpoint rather than the low edge: the low edge systematically
// understates the true slope (by up to half a class width for wide classes like
// HILLY 15-30 or STEEP 30-50), and tuning against the US bulk test estimated
// ~+0.5 pt top-1 for the midpoint. STEEPEST is open-ended so it stays at 100.
// NOTE: the backend export mirrors this mapping (terraso-backend
// apps/export/fetch_data.py _SLOPE_SELECT_MIDPOINT_PCT); keep the two in sync or
// the in-app and export soil-ID scores diverge.
export const selectToPercent = (
  select: SoilIdSoilDataSlopeSteepnessSelectChoices,
) => {
  switch (select) {
    /** 0 - 2% (flat) -> midpoint */
    case 'FLAT':
      return 1;
    /** 2 - 5% (gentle) -> midpoint */
    case 'GENTLE':
      return 3.5;
    /** 15 - 30% (hilly) -> midpoint */
    case 'HILLY':
      return 22.5;
    /** 5 - 10% (moderate) -> midpoint */
    case 'MODERATE':
      return 7.5;
    /** 50 - 60% (moderately steep) -> midpoint */
    case 'MODERATELY_STEEP':
      return 55;
    /** 10 - 15% (rolling) -> midpoint */
    case 'ROLLING':
      return 12.5;
    /** 30 - 50% (steep) -> midpoint */
    case 'STEEP':
      return 40;
    /** 100%+ (steepest) -> open-ended, low edge */
    case 'STEEPEST':
      return 100;
    /** 60 - 100% (very steep) -> midpoint */
    case 'VERY_STEEP':
      return 80;
  }
};

export const soilDataSlopePercent = (
  data: SoilData,
): Maybe<number> | undefined => {
  if (data.slopeSteepnessSelect) {
    return selectToPercent(data.slopeSteepnessSelect!);
  } else if (typeof data.slopeSteepnessDegree === 'number') {
    return degreeToPercent(data.slopeSteepnessDegree);
  } else {
    return data.slopeSteepnessPercent;
  }
};

export const soilDataToIdInput = (
  data: SoilData,
  elevation?: number | null,
): SoilIdInputData => {
  return {
    depthDependentData: data.depthDependentData.map(
      soilDepthDependentDataToIdInput,
    ),
    // Sent when known so the backend can skip its Mapbox elevation lookup
    // and use the client's already-fetched value as pElev.
    elevation: typeof elevation === 'number' ? elevation : undefined,
    slope: soilDataSlopePercent(data),
    surfaceCracks: data.surfaceCracksSelect,
  };
};

export const soilDepthDependentDataToIdInput = (
  data: DepthDependentSoilData,
): SoilIdInputDepthDependentData => {
  const {colorHue, colorValue, colorChroma} = data;
  // Send raw Munsell; the backend converts to LAB via its reference table.
  // Keep the all-three-numbers guard — partial Munsell is meaningless here.
  const colorMunsellNumeric =
    typeof colorHue === 'number' &&
    typeof colorValue === 'number' &&
    typeof colorChroma === 'number'
      ? {hue: colorHue, value: colorValue, chroma: colorChroma}
      : undefined;
  return {
    depthInterval: data.depthInterval,
    colorMunsellNumeric,
    rockFragmentVolume: data.rockFragmentVolume,
    texture: data.texture,
  };
};
