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

import {getDeltaE00} from 'delta-e';
import {rgb255ToMhvc} from 'munsell';
import quantize from 'quantize';

import {nonNeutralColorHues} from 'terraso-client-shared/soilId/soilIdTypes';
import {entries} from 'terraso-client-shared/utils';

import {munsellHVCToLAB} from 'terraso-mobile-client/model/color/colorConversions';
import {SOIL_COLORS} from 'terraso-mobile-client/model/color/soilColors';
import {
  ColorResult,
  MunsellHVC,
  RGB,
  RGBA,
} from 'terraso-mobile-client/model/color/types';

const SOIL_COLOR_SIMILARITY_THRESHOLD = 5;
const COLOR_COUNT = 5;

// Correction values obtain from spectrophotometer Observer. = 2°, Illuminant = D65
export const REFERENCES = {
  CAMERA_TRAX: [210.15, 213.95, 218.42],
  CANARY_POST_IT: [249.92, 242.07, 161.42],
  WHITE_BALANCE: [192.96, 192.0, 191.74],
} as const satisfies Record<string, RGB>;

export const getColor = (
  pixelCard: RGBA[],
  pixelSoil: RGBA[],
  referenceRGB: RGB,
): ColorResult => {
  const predicted = rgb255ToMhvc(
    ...predictColorFromReference(pixelSoil, pixelCard, referenceRGB),
  );

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

export const predictColorFromReference = (
  samplePixels: RGBA[],
  referencePixels: RGBA[],
  referenceRGB: RGB,
) => {
  return correctSampleRGB(
    dominantColor(referencePixels),
    dominantColor(samplePixels),
    referenceRGB,
  );
};

const correctSampleRGB = (
  cardPixel: RGB,
  samplePixel: RGB,
  referenceRGB: RGB,
): RGB => {
  return cardPixel.map(
    (cardV, index) => (referenceRGB[index] / cardV) * samplePixel[index],
  ) as RGB;
};

export const dominantColor = (pixels: RGBA[]): RGB => {
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
  var colorMap = quantize(pixelArray, COLOR_COUNT);
  if (colorMap === false) {
    throw new Error('Unexpected color algorithm failure!');
  }

  const colorsWithCounts = colorMap.vboxes.map(
    vbox => [vbox.color, vbox.vbox.count()] as const,
  );
  const [dominantColor] = colorsWithCounts.sort(([, c1], [, c2]) => c2 - c1)[0];

  return dominantColor;
};

const nearestSoilColor = (color: MunsellHVC) =>
  FLATTENED_SOIL_COLORS.reduce((a, b) =>
    munsellDistance(a, color) < munsellDistance(b, color) ? a : b,
  );

const munsellDistance = (a: MunsellHVC, b: MunsellHVC): number =>
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
