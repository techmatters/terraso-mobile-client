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
  colorHueSubsteps,
  colorHues,
  colorValues,
} from 'terraso-client-shared/soilId/soilIdTypes';

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

export const munsellToRGB: (h: number, v: number, c: number) => RGB =
  mhvcToRgb255;

export const getColor = (
  pixelCard: RGBA[],
  pixelSoil: RGBA[],
  referenceRGB: RGB,
) => {
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
  const [colorHue, colorValue, colorChroma] = rgb255ToMhvc(...sample.rgb);

  return {
    ...sample,
    munsell: {colorHue, colorValue, colorChroma},
  };
};

export const isValidSoilColor = ({colorChroma}: MunsellColor) =>
  colorChroma < 8.5;

export const renderMunsellHue = (h: number) => {
  if (h === 100) {
    h = 0;
  }
  let hueIndex = Math.floor(h / 10);
  let hueSubstep = Math.round((h % 10) / 2.5);

  if (hueSubstep === 0) {
    hueIndex = (hueIndex + 9) % 10;
    hueSubstep = 4;
  }
  const hue = colorHues[hueIndex];
  hueSubstep = (hueSubstep * 5) / 2;

  return {hueSubstep: hueSubstep as (typeof colorHueSubsteps)[number], hue};
};

export const parseMunsellHue = ({
  hue,
  hueSubstep,
}: ReturnType<typeof renderMunsellHue>) =>
  colorHues.indexOf(hue) * 10 + hueSubstep;

export const munsellToString = ({
  colorHue: h,
  colorValue: v,
  colorChroma: c,
}: MunsellColor) => {
  const {hueSubstep, hue} = renderMunsellHue(h);
  const value = [...colorValues].sort(
    (v1, v2) => Math.abs(v1 - v) - Math.abs(v2 - v),
  )[0];

  const chroma = Math.round(c);

  return `${hueSubstep}${hue} ${value}/${chroma}`;
};
