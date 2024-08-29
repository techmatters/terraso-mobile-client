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

import {Buffer} from '@craftzdog/react-native-buffer';
import * as Sentry from '@sentry/react-native';
import {getDeltaE00} from 'delta-e';
import {rgb255ToMhvc} from 'munsell';
import quantize from 'quantize';

import {nonNeutralColorHues} from 'terraso-client-shared/soilId/soilIdTypes';
import {entries} from 'terraso-client-shared/utils';

import {
  decodeBase64Jpg,
  PhotoWithBase64,
} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {munsellHVCToLAB} from 'terraso-mobile-client/model/color/colorConversions';
import {SOIL_COLORS} from 'terraso-mobile-client/model/color/soilColors';
import {
  ColorResult,
  MunsellHVC,
  RGB,
  RGBA,
} from 'terraso-mobile-client/model/color/types';

// Threshold used to determine whether to accept the algorithm's output
// as a valid soil color, or consider it an unknown soil color and provide
// a suggested alternative. This value was arrived at via ad-hoc testing.
const SOIL_COLOR_SIMILARITY_THRESHOLD = 5;
// Number of colors into which images are quantized while determining their dominant color.
// This value was arrived at via ad-hoc testing.
const QUANTIZATION_COLOR_COUNT = 5;

// These are the theoretical "correct" colors for several different reference objects.
// The algorithm compares the color of the reference object in the picture to these colors
// to figure out how to adjust the color of the soil. I don't really fully understand it,
// but I'm leaving the following science-y note about the conditions under which these values
// were measured in case they are needed in the future: Observer = 2°, Illuminant = D65
const REFERENCES = {
  CAMERA_TRAX: [210.15, 213.95, 218.42],
  CANARY_POST_IT: [249.92, 242.07, 161.42],
  WHITE_BALANCE: [192.96, 192.0, 191.74],
} as const satisfies Record<string, RGB>;

export const getColorFromImages = ({
  reference,
  soil,
}: Record<'soil' | 'reference', PhotoWithBase64>) => {
  const [referencePixels, soilPixels] = [reference, soil].map(({base64}) => {
    const {data, height, width} = decodeBase64Jpg(base64);
    const pixels: RGBA[] = [];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < height; x++) {
        const offset = (y * width + x) * 4;
        pixels.push([...data.slice(offset, offset + 4)] as RGBA);
      }
    }
    return pixels;
  });

  try {
    return getColorFromPixels(
      referencePixels,
      soilPixels,
      REFERENCES.CANARY_POST_IT,
    );
  } catch (e) {
    Sentry.captureEvent(
      {message: 'color algorithm failure'},
      {
        attachments: [
          {
            filename: 'reference.jpg',
            data: Buffer.from(reference.base64, 'base64'),
          },
          {
            filename: 'soil.jpg',
            data: Buffer.from(soil.base64, 'base64'),
          },
        ],
      },
    );

    // TODO: we've never hit this catch block before so it's low priority, ideally we'd
    // return something that eventually gets displayed to the user here instead of throwing.
    throw e;
  }
};

export const getColorFromPixels = (
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

  // quantize.js performs median cut algorithm, and returns a palette of the dominant colors in the picture
  var colorMap = quantize(pixelArray, QUANTIZATION_COLOR_COUNT);
  if (colorMap === false) {
    throw new Error('Unexpected color algorithm failure!');
  }

  const colorsWithCounts = colorMap.vboxes.map(
    vbox => [vbox.color, vbox.vbox.count()] as const,
  );
  const [color] = colorsWithCounts.sort(
    ([, count1], [, count2]) => count2 - count1,
  )[0];

  return color;
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
