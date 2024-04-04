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

import {mhvcToRgb255, rgb255ToMhvc} from 'munsell';
import quantize from 'quantize';
import {
  nonNeutralColorHues,
  colorHueSubsteps,
  colorValues,
  SoilColorHue,
  NonNeutralColorHue,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {
  FLATTENED_SOIL_COLORS,
  MHVC,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/soilColors';

export const REFERENCES = {
  CAMERA_TRAX: [210.15, 213.95, 218.42],
  CANARY_POST_IT: [249.92, 242.07, 161.42],
  WHITE_BALANCE: [192.96, 192.0, 191.74],
} as const satisfies Record<string, RGB>;

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];
export type MunsellColor = {
  colorHue: number;
  colorChroma: number;
  colorValue: number;
};

const COLOR_COUNT = 16;

export const munsellToRGB = ({
  colorHue,
  colorValue,
  colorChroma,
}: MunsellColor): RGB => mhvcToRgb255(colorHue, colorValue, colorChroma);

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
  const getPalette = (pixels: RGBA[]) => {
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
  const nearest = FLATTENED_SOIL_COLORS.reduce((a, b) =>
    munsellDistance(a, predicted) < munsellDistance(b, predicted) ? a : b,
  );

  const nearestResult = {
    colorHue: nearest[0],
    colorValue: nearest[1],
    colorChroma: nearest[2],
  };

  if (munsellDistance(nearest, predicted) < 5) {
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

// garo's janky formula before they know about CIE color difference
// to be replaced
const munsellDistance = (
  [aHue, aValue, aChroma]: MHVC,
  [bHue, bValue, bChroma]: MHVC,
): number => {
  const valueDistance = Math.abs(aValue - bValue);
  const chromaDistance = Math.abs(aChroma - bChroma);

  const hueDistance =
    Math.min(Math.abs(aHue - bHue), 100 - Math.abs(aHue - bHue)) / 10;
  const minChroma = Math.min(aChroma, bChroma);
  const hueScaleFactor = minChroma / (1 + minChroma);

  return valueDistance + chromaDistance + hueDistance * hueScaleFactor;
};

type MunsellHue = {
  hue: SoilColorHue | NonNeutralColorHue;
  substep?: (typeof colorHueSubsteps)[number];
};

export const renderMunsellHue = ({
  colorHue: h,
  colorChroma,
}: {
  colorHue: number;
  colorChroma?: number | null;
}): MunsellHue => {
  if (typeof colorChroma === 'number' && Math.round(colorChroma) === 0) {
    return {substep: undefined, hue: 'N'} as const;
  }
  if (h === 100) {
    h = 0;
  }
  let hueIndex = Math.floor(h / 10);
  let hueSubstep = Math.round((h % 10) / 2.5);

  if (hueSubstep === 0) {
    hueIndex = (hueIndex + 9) % 10;
    hueSubstep = 4;
  }
  const hue = nonNeutralColorHues[hueIndex];
  hueSubstep = (hueSubstep * 5) / 2;

  return {substep: hueSubstep as (typeof colorHueSubsteps)[number], hue};
};

export const parseMunsellHue = ({hue, substep: hueSubstep}: MunsellHue) =>
  (hue === 'N' ? 0 : nonNeutralColorHues.indexOf(hue)) * 10 + (hueSubstep ?? 0);

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
