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

import {LAB, getDeltaE00} from 'delta-e';
import {labToMhvc, mhvcToLab, mhvcToRgb255, rgb255ToMhvc} from 'munsell';
import quantize from 'quantize';
import {
  nonNeutralColorHues,
  colorValues,
  ColorHueSubstep,
  ColorHue,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {entries} from 'terraso-client-shared/utils';
import {SOIL_COLORS} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColors';

const SOIL_COLOR_SIMILARITY_THRESHOLD = 5;

export const REFERENCES = {
  CAMERA_TRAX: [210.15, 213.95, 218.42],
  CANARY_POST_IT: [249.92, 242.07, 161.42],
  WHITE_BALANCE: [192.96, 192.0, 191.74],
} as const satisfies Record<string, RGB>;

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];
// Munsell hue/value/chroma tuple
export type MunsellHVC = readonly [number, number, number];
export type MunsellColor = {
  colorHue: number;
  colorChroma: number;
  colorValue: number;
};

export type PartialMunsellColor = {
  colorHue?: number | null;
  colorChroma?: number | null;
  colorValue?: number | null;
};

const COLOR_COUNT = 16;

export const fullMunsellColor = (
  color: PartialMunsellColor,
): MunsellColor | undefined => {
  if (
    typeof color.colorHue === 'number' &&
    typeof color.colorChroma === 'number' &&
    typeof color.colorValue === 'number'
  ) {
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

export const getPalette = (pixels: RGBA[]) => {
  // Transform pixel info from canvas so quantize can use it
  const pixelArray = pixels.flatMap(([r, g, b, a]) => {
    // If pixel is mostly opaque and not white
    if (a >= 125) {
      if (!(r > 250 && g > 250 && b > 250)) {
        return [[r, g, b] as quantize.RgbPixel];
      }
    }
    return [];
  });
  // Quantize.js performs median cut algorithm, and returns a palette of the "top 16" colors in the picture
  var cmap = quantize(pixelArray, COLOR_COUNT);
  if (cmap === false) {
    throw new Error('Unexpected color algorithm failure!');
  }

  return cmap.palette();
};

export type ValidColorResult = {result: MunsellColor};
export type InvalidColorResult = {
  invalidResult: MunsellColor;
  nearestValidResult: MunsellColor;
};
export type ColorResult = ValidColorResult | InvalidColorResult;
export const getColor = (
  pixelCard: RGBA[],
  pixelSoil: RGBA[],
  referenceRGB: RGB,
): ColorResult => {
  // Get the color palettes of both soil and card
  const paletteCard = getPalette(pixelCard);
  const paletteSample = getPalette(pixelSoil);

  // Correction values obtain from spectrophotometer Observer. = 2°, Illuminant = D65
  const correctSampleRGB = (cardPixel: RGB, samplePixel: RGB) => {
    const corrected = cardPixel.map(
      (cardV, index) => (referenceRGB[index] / cardV) * samplePixel[index],
    ) as RGB;

    return {
      rgb: corrected,
      rgbRaw: samplePixel,
    };
  };

  const sample = correctSampleRGB(paletteCard[0], paletteSample[0]);
  const predicted = rgb255ToMhvc(...sample.rgb);

  // take the minimum by distance to predicted color
  const nearest = nearestSoilColor(predicted);

  const nearestResult = {
    colorHue: nearest[0],
    colorValue: nearest[1],
    colorChroma: nearest[2],
  };

  if (munsellDistance(nearest, predicted) < SOIL_COLOR_SIMILARITY_THRESHOLD) {
    return {result: nearestResult};
  }

  return {
    nearestValidResult: nearestResult,
    invalidResult: {
      colorHue: predicted[0],
      colorValue: predicted[1],
      colorChroma: predicted[2],
    },
  };
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

export const nearestSoilColor = (color: MunsellHVC) =>
  FLATTENED_SOIL_COLORS.reduce((a, b) =>
    munsellDistance(a, color) < munsellDistance(b, color) ? a : b,
  );

export const munsellDistance = (a: MunsellHVC, b: MunsellHVC): number =>
  getDeltaE00(munsellHVCToLAB(a), munsellHVCToLAB(b));

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
