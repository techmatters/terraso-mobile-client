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

/*
 * We'd like to only suggest/allow users to input Munsell colors
 * that are commonly associated with soil. This file implements
 * validation functions that can be used to determine which properties
 * of a color are possible given other properties, and to find the
 * closest soil color to any other arbitrary Munsell color
 */

import {
  ColorChroma,
  ColorHueSubstep,
  ColorValue,
  SoilColorHue,
  colorChromas,
  colorHueSubsteps,
  colorValues,
  nonNeutralColorHues,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {entries} from 'terraso-client-shared/utils';
import {SOIL_COLORS} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColors';

// Munsell hue/value/chroma tuple
type MunsellHVC = readonly [number, number, number];

export type PartialColor = {
  hue: SoilColorHue | null;
  substep: ColorHueSubstep | null;
  value: ColorValue | null;
  chroma: ColorChroma | 0 | null;
};

export type ColorUpdate =
  | {hue: SoilColorHue | null}
  | {substep: ColorHueSubstep | null}
  | {value: ColorValue | null}
  | {chroma: ColorChroma | null};

export type ValidProperties = {
  substeps: ColorHueSubstep[] | readonly ColorHueSubstep[];
  values: ColorValue[] | readonly ColorValue[];
  chromas: ColorChroma[] | readonly ColorChroma[];
};

export const updateColorSelections = (
  color: PartialColor,
  update: ColorUpdate,
): PartialColor => {
  color = {...color, ...update};

  if ('hue' in update && update.hue === 'N') {
    color.substep = null;
    color.chroma = 0;
  }

  if (!isSubstepValid(color)) {
    color.substep = null;
  }
  if (!isValueValid(color)) {
    color.value = null;
  }
  if (!isChromaValid(color)) {
    color.chroma = null;
  }

  return color;
};

// given (possibly unselected) values for Munsell hue, hue substep, and value
// returns a set of possible values for hue substep, value, and chroma based on
// the SOIL_COLORS table. note that we take hue
export const validProperties = (color: PartialColor): ValidProperties => {
  if (color.hue === null) {
    return {
      substeps: colorHueSubsteps,
      values: colorValues,
      chromas: colorChromas,
    };
  }

  const substeps = SOIL_COLORS[color.hue].flatMap(([substep, _]) =>
    substep === 0 ? [] : [substep],
  );

  if (color.substep === null) {
    const allValues = new Set<ColorValue>();
    const allChromas = new Set<ColorChroma>();
    for (const [_, valueChromas] of SOIL_COLORS[color.hue]) {
      for (const [value, chromas] of valueChromas) {
        allValues.add(value);
        for (const chroma of chromas) {
          if (chroma !== 0) {
            allChromas.add(chroma);
          }
        }
      }
    }

    return {
      substeps,
      values: [...allValues.keys()].sort(),
      chromas: [...allChromas.keys()].sort(),
    };
  }

  const valueChromas = SOIL_COLORS[color.hue].find(
    ([substep, _]) => substep === color.substep,
  )![1];

  const values = valueChromas.map(([value, _]) => value);

  if (color.value === null) {
    const allChromas = new Set<ColorChroma>();
    for (const [_, chromas] of valueChromas) {
      for (const chroma of chromas) {
        if (chroma !== 0) {
          allChromas.add(chroma);
        }
      }
    }
    return {
      substeps,
      values: values,
      chromas: [...allChromas.keys()].sort(),
    };
  }

  const chromas = valueChromas
    .find(([value, _]) => value === color.value)![1]
    .filter((chroma): chroma is ColorChroma => chroma !== 0);

  return {substeps, values, chromas};
};

export const isSubstepValid = (color: PartialColor) => {
  return (
    color.substep === null ||
    validProperties({
      hue: color.hue,
      substep: null,
      value: null,
      chroma: null,
    }).substeps.includes(color.substep)
  );
};

export const isValueValid = (color: PartialColor) => {
  return (
    color.value === null ||
    validProperties({...color, value: null, chroma: null}).values.includes(
      color.value,
    )
  );
};

export const isChromaValid = (color: PartialColor) => {
  if (color.hue === 'N') {
    return color.chroma === 0;
  } else if (color.chroma === 0) {
    return false;
  }
  return (
    color.chroma === null ||
    validProperties(color).chromas.includes(color.chroma)
  );
};

const FLATTENED_SOIL_COLORS: MunsellHVC[] = entries(SOIL_COLORS).flatMap(
  ([hue, substepValueChromas]) =>
    substepValueChromas.flatMap(([substep, valueChromas]) =>
      valueChromas.flatMap(([value, chromas]) =>
        chromas.map(
          chroma =>
            [
              hue === 'N' ? 0 : nonNeutralColorHues.indexOf(hue) * 10 + substep,
              value,
              chroma,
            ] as const,
        ),
      ),
    ),
);

export const nearestSoilColor = (color: MunsellHVC) =>
  FLATTENED_SOIL_COLORS.reduce((a, b) =>
    munsellDistance(a, color) < munsellDistance(b, color) ? a : b,
  );

// garo's janky formula before they knew about CIE color difference
// works ok, but should be replaced at some point
export const munsellDistance = (
  [aHue, aValue, aChroma]: MunsellHVC,
  [bHue, bValue, bChroma]: MunsellHVC,
): number => {
  const valueDistance = Math.abs(aValue - bValue);
  const chromaDistance = Math.abs(aChroma - bChroma);

  const hueDistance =
    Math.min(Math.abs(aHue - bHue), 100 - Math.abs(aHue - bHue)) / 10;
  const minChroma = Math.min(aChroma, bChroma);
  const hueScaleFactor = minChroma / (1 + minChroma);

  return valueDistance + chromaDistance + hueDistance * hueScaleFactor;
};
