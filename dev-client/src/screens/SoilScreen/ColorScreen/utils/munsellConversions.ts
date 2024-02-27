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

import {munsellToRgb255, rgb255ToMhvc} from 'munsell';
import quantize from 'quantize';
import {
  SoilColorHue,
  SoilColorValue,
  colorChromas,
  colorHueSubsteps,
  colorHues,
} from 'terraso-client-shared/soilId/soilIdTypes';

export const REFERENCES = {
  CAMERA_TRAX: [210.15, 213.95, 218.42],
  CANARY_POST_IT: [249.92, 242.07, 161.42],
  WHITE_BALANCE: [192.96, 192.0, 191.74],
} as const satisfies Record<string, RGB>;

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];

const COLOR_COUNT = 16;

export const munsellToRGB = (
  h: `${number}${SoilColorHue}`,
  v: string,
  c: string,
): RGB => munsellToRgb255(`${h} ${v}/${c}`);

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
    return cmap ? cmap.palette() : null;
  };

  // Get the color palettes of both soil and card
  const paletteCard = getPalette(pixelCard);
  const paletteSample = getPalette(pixelSoil);

  if (!paletteCard || !paletteSample) {
    return undefined;
  }

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
  const [h, v, c] = rgb255ToMhvc(...sample.rgb);
  console.log(h, v, c);

  let hueIndex = Math.floor(h / 10);
  let hueSubstep = Math.round((h % 10) / 4) - 1;
  if (hueSubstep === -1) {
    hueIndex = (hueIndex + 9) % 10;
    hueSubstep = 3;
  }
  if (hueIndex > 6) {
    return undefined;
  }
  const colorHue = colorHues[6 - hueIndex];
  const colorHueSubstep = colorHueSubsteps[hueSubstep];

  let colorValue: SoilColorValue;
  if (v <= 2 || v >= 10) {
    return undefined;
  }
  /* eslint-disable curly */
  if (v <= 2.75) colorValue = 'VALUE_2_5';
  else if (v <= 3.5) colorValue = 'VALUE_3';
  else if (v <= 4.5) colorValue = 'VALUE_4';
  else if (v <= 5.5) colorValue = 'VALUE_5';
  else if (v <= 6.5) colorValue = 'VALUE_6';
  else if (v <= 7.5) colorValue = 'VALUE_7';
  else if (v <= 8.25) colorValue = 'VALUE_8';
  else if (v <= 8.75) colorValue = 'VALUE_8_5';
  else if (v <= 9.25) colorValue = 'VALUE_9';
  else colorValue = 'VALUE_9_5';
  /* eslint-enable curly */

  const chroma = Math.round(c);
  if (chroma < 1 || chroma > 8) {
    return undefined;
  }
  const colorChroma = colorChromas[chroma - 1];

  return {
    ...sample,
    munsell: {colorValue, colorChroma, colorHue, colorHueSubstep},
  };
};
