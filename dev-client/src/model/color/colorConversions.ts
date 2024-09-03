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
 * This file wraps some libraries to allow us to do conversions
 * within Munsell color space, and between Munsell and RGB color space.
 *
 * Background reading on the Munsell color system:
 *   https://en.wikipedia.org/wiki/Munsell_color_system
 *
 * Background reading on the library we use and its data representation:
 *   https://privet-kitty.github.io/munsell.js/modules.html
 *
 * We use the same numeric representation as the munsell library,
 * i.e. hue is represented by a number in [0, 100], value is in [0, 10],
 * and chroma is in [0, ∞).
 *
 * In the string representation, hues are denoted using 10 major steps,
 * e.g. R for red, GY for green-yellow, which are subdivided into substeps,
 * e.g. 2.5R, 5R, to differentiate the hues further. The hue value from [0, 100]
 * can then be converted to a step/substep pair by dividing/rounding by 10 to
 * get the step, and taking the remainder modulo 10 to get the substep.
 *
 * For chroma values of 0, the special notation N 5/, N 10/, etc is used,
 * with N standing for "neutral". In this case we don't care about the hue
 * and the chroma is 0, so both those pieces of information are missing and
 * the only number left is the value.
 */

import {LAB} from 'delta-e';
import {labToMhvc, mhvcToLab, mhvcToRgb255} from 'munsell';

import {
  ColorHue,
  ColorHueSubstep,
  colorValues,
  nonNeutralColorHues,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  MunsellColor,
  MunsellHVC,
  PartialMunsellColor,
  RGB,
} from 'terraso-mobile-client/model/color/types';

export const isColorComplete = <T>(
  soilData: T & PartialMunsellColor,
): soilData is T & MunsellColor => {
  return (
    typeof soilData?.colorHue === 'number' &&
    typeof soilData.colorValue === 'number' &&
    typeof soilData.colorChroma === 'number'
  );
};

export const fullMunsellColor = (
  color: PartialMunsellColor,
): MunsellColor | undefined => {
  if (isColorComplete(color)) {
    return {
      colorHue: color.colorHue,
      colorChroma: color.colorChroma,
      colorValue: color.colorValue,
    };
  } else {
    return undefined;
  }
};

export const munsellToRGB = ({
  colorHue,
  colorValue,
  colorChroma,
}: MunsellColor): RGB => mhvcToRgb255(colorHue, colorValue, colorChroma);

export const munsellHVCToLAB = (color: MunsellHVC): LAB => {
  const [L, A, B] = mhvcToLab(...color);
  return {L, A, B};
};

export const LABToMunsell = ({L, A, B}: LAB): MunsellColor => {
  const [colorHue, colorValue, colorChroma] = labToMhvc(L, A, B);
  return {colorHue, colorValue, colorChroma};
};

type PartialHue = {
  hue: ColorHue | null;
  substep: ColorHueSubstep | null;
};

export const renderMunsellHue = ({
  colorHue,
  colorChroma,
}: PartialMunsellColor): PartialHue => {
  if (typeof colorHue !== 'number') {
    return {substep: null, hue: null};
  }
  if (typeof colorChroma === 'number' && Math.round(colorChroma) === 0) {
    return {substep: null, hue: 'N'} as const;
  }
  if (colorHue === 100) {
    colorHue = 0;
  }
  let hueIndex = Math.floor(colorHue / 10);
  let substep = Math.round((colorHue % 10) / 2.5);

  if (substep === 0) {
    hueIndex = (hueIndex + 9) % 10;
    substep = 4;
  }
  substep = (substep * 5) / 2;

  return {
    substep: substep as ColorHueSubstep,
    hue: nonNeutralColorHues[hueIndex],
  };
};

export const parseMunsellHue = ({hue, substep}: PartialHue): number | null => {
  if (hue === null) {
    return null;
  }
  if (hue === 'N') {
    return 0;
  }
  return nonNeutralColorHues.indexOf(hue) * 10 + (substep ?? 0);
};

export const munsellToString = (color: MunsellColor) => {
  const {substep: hueSubstep, hue} = renderMunsellHue(color);
  const {colorValue: v, colorChroma: c} = color;
  const value = [...colorValues].reduce((v1, v2) =>
    Math.abs(v1 - v) < Math.abs(v2 - v) ? v1 : v2,
  );

  const chroma = Math.round(c);

  if (chroma === 0) {
    return `N ${value}/`;
  }

  return `${hueSubstep}${hue} ${value}/${chroma}`;
};
