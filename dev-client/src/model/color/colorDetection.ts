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

// The "correct" colors for each reference card the user can choose (keyed by
// REFERENCE_TYPES below). The algorithm compares the reference card's color in
// the photo to these to figure out how to adjust the soil color. Each value is
// data-fit from the Munsell-chart validator captures (see per-entry notes).
const REFERENCES = {
  // Data-fit ideal from the Munsell-chart validator captures (iPhone RAW,
  // single natural-exposure shots), minimizing median ΔE00 over ~430 chart
  // patches. Replaces the legacy D65-measured [249.92, 242.07, 161.42]; the
  // blue channel is notably higher (post-it reads less saturated-yellow than
  // the old value assumed). Fit in linear per-channel correction space, which
  // is exactly what correctSampleRGB now applies (see below).
  CANARY_POST_IT: [247.6, 237.0, 173.3],
  // Generic 18% neutral gray card (~18% reflectance, spectrally flat). 18%
  // linear-sRGB (r = g = b = 0.18) gamma-encoded to sRGB 0–255. Source value
  // tracks fix/munsell-export's LINEAR_REFERENCES.GRAY_CARD_18PCT. Left neutral
  // on purpose: the data wants a blue-shifted grey, but that cast is a
  // page/hue-dependent chart+pipeline effect (an independent neutral card,
  // WhiBal, shows the same per-page pattern), not the grey card — so it
  // belongs in the pipeline, not baked into this reference. Best *neutral*
  // grey fit is ~sRGB 125.
  GRAY_CARD_18PCT: [118, 118, 118],
  // WhiBal G7 Certified Neutral — kept neutral (r = g = b). Data-fit from the
  // Munsell-chart validator captures puts the best neutral at sRGB ~188
  // (≈0.505 linear, i.e. ~50% reflectance — not the datasheet 40%); rounded to
  // 190. Roughly halves median ΔE00 vs the old [170, 170, 170].
  WHIBAL_G7: [190, 190, 190],
} as const satisfies Record<string, RGB>;

// The reference cards a user can choose from in the color guide, in display
// order. Each is a key into REFERENCES above.
export const REFERENCE_TYPES = [
  'GRAY_CARD_18PCT',
  'WHIBAL_G7',
  'CANARY_POST_IT',
] as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export const getColorFromImages = ({
  reference,
  soil,
  referenceType,
}: Record<'soil' | 'reference', PhotoWithBase64> & {
  referenceType: ReferenceType;
}) => {
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
      REFERENCES[referenceType],
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

// Standard piecewise sRGB transfer function (8-bit sRGB → linear-light [0,1]).
const srgbToLinear = (c: number): number => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

// Inverse of srgbToLinear (linear-light [0,1] → 8-bit sRGB). Clamps to [0, 255].
const linearToSrgb = (x: number): number => {
  const clamped = Math.max(0, Math.min(1, x));
  const c =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
};

const correctSampleRGB = (
  cardPixel: RGB,
  samplePixel: RGB,
  referenceRGB: RGB,
): RGB => {
  // Per-channel gain (von-Kries-style WB correction) is only physically correct
  // in linear-light space. Doing it on sRGB-encoded values under/over-corrects
  // depending on where each value sits on the gamma curve — and the REFERENCES
  // above were fit in linear space, so the correction must match. Linearize,
  // apply the gain, then re-encode to sRGB for the downstream Munsell lookup.
  return cardPixel.map((cardV, index) => {
    const cardLin = srgbToLinear(cardV);
    if (cardLin === 0) return 0; // guard against a fully-black card
    const sampleLin = srgbToLinear(samplePixel[index]);
    const referenceLin = srgbToLinear(referenceRGB[index]);
    return linearToSrgb((referenceLin / cardLin) * sampleLin);
  }) as RGB;
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
