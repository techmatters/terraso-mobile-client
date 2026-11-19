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
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';

// Threshold used to determine whether to accept the algorithm's output
// as a valid soil color, or consider it an unknown soil color and provide
// a suggested alternative. This value was arrived at via ad-hoc testing.
const SOIL_COLOR_SIMILARITY_THRESHOLD = 5;
// Number of colors into which images are quantized while determining their dominant color.
// This value was arrived at via ad-hoc testing.
const QUANTIZATION_COLOR_COUNT = 5;

// linear-sRGB [0,1] → display-encoded sRGB [0,255]. Used both to re-encode a
// corrected linear colour on the way into the Munsell conversion (which is
// defined on sRGB-255) and to paint linear colours as swatches.
export const linearToSrgb255 = (c: number): number => {
  const clamped = Math.max(0, Math.min(1, c));
  const encoded =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
};

// sRGB display-encoded [0,255] → linear-sRGB [0,1]. Inverse of linearToSrgb255.
// Brings an 8-bit measured colour (JPEG/HEIC/PNG) onto the same linear scale a
// DNG raw decode produces, so the reference/sample white-balance ratio is
// computed in physically-linear space for every capture format.
export const srgb255ToLinear = (c255: number): number => {
  const c = Math.max(0, Math.min(1, c255 / 255));
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

// Shared tail of every analysis path: a predicted Munsell colour → the nearest
// catalogued soil colour, tagged valid/invalid by the similarity threshold.
export const colorResultFromMhvc = (predicted: MunsellHVC): ColorResult => {
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

// --- Unified linear-space analysis -----------------------------------------
// Every capture format resolves to a measured LINEAR-sRGB colour for the
// reference patch and for the soil, then shares this one correction + Munsell
// mapping. DNG supplies true raw linear pixels (native decode, see
// dngColorAnalysis.ts); JPEG/HEIC/PNG reach linear via srgb255ToLinear after an
// 8-bit decode (getColorFromJpegCrops below). The ONLY per-format difference is
// how the measured colours are produced — the correction and Munsell steps are
// identical.

// Per-channel reference white-balance in linear space: scale the soil by the
// ratio of the card's expected colour to its measured colour. Linear (not
// gamma) is where this ratio is physically meaningful — exposure / illuminant
// is a linear gain on the sensor.
const correctLinear = (
  measuredReference: LinearRgb,
  measuredSoil: LinearRgb,
  expected: LinearRgb,
): LinearRgb => {
  const scale = (e: number, measured: number) =>
    measured > 0 ? e / measured : 0;
  return {
    r: scale(expected.r, measuredReference.r) * measuredSoil.r,
    g: scale(expected.g, measuredReference.g) * measuredSoil.g,
    b: scale(expected.b, measuredReference.b) * measuredSoil.b,
  };
};

// Corrected soil colour as a Munsell HVC, WITHOUT snapping to the nearest
// catalogued soil colour — the raw predicted chip. colorResultFromMhvc adds the
// catalogue match on top; the explainer screen wants this pre-snap value so it
// can show the corrected colour itself.
export const predictMhvcFromLinear = (
  measuredReference: LinearRgb,
  measuredSoil: LinearRgb,
  expected: LinearRgb,
): MunsellHVC => {
  const corrected = correctLinear(measuredReference, measuredSoil, expected);
  // The munsell conversion is defined on display-encoded sRGB-255; re-encode
  // the corrected linear colour on the way in.
  return rgb255ToMhvc(
    linearToSrgb255(corrected.r),
    linearToSrgb255(corrected.g),
    linearToSrgb255(corrected.b),
  );
};

// The unified predictor: measured reference + measured soil + the picked card's
// expected colour (all linear sRGB) → corrected soil colour → Munsell → soil
// colour result. Shared by the DNG and JPEG/HEIC/PNG paths.
export const predictColorFromLinear = (
  measuredReference: LinearRgb,
  measuredSoil: LinearRgb,
  expected: LinearRgb,
): ColorResult =>
  colorResultFromMhvc(
    predictMhvcFromLinear(measuredReference, measuredSoil, expected),
  );

// Measured linear-sRGB colour of one JPEG/HEIC/PNG crop: dominant sRGB
// (median-cut, same as the legacy pipeline) lifted to linear. HEIC/PNG are
// normalised to JPEG at pick time, so the crop is JPEG here. There are no raw
// sensor pixels for these formats, so the 8-bit dominant IS the colour. Shared
// by the home-screen result and the explainer so both read the same number.
export const measuredLinearFromJpegCrop = (
  crop: PhotoWithBase64,
): LinearRgb => {
  const [r, g, b] = dominantColor(cropPixels(crop.base64));
  return {
    r: srgb255ToLinear(r),
    g: srgb255ToLinear(g),
    b: srgb255ToLinear(b),
  };
};

// JPEG/HEIC/PNG path of the unified analysis.
export const getColorFromJpegCrops = ({
  reference,
  soil,
  expected,
}: {
  reference: PhotoWithBase64;
  soil: PhotoWithBase64;
  expected: LinearRgb;
}): ColorResult =>
  predictColorFromLinear(
    measuredLinearFromJpegCrop(reference),
    measuredLinearFromJpegCrop(soil),
    expected,
  );

// Decode a base64 JPEG crop into RGBA pixels. Crops are square (ColorCropScreen
// resizes to a square ≤200px) so this is a small buffer.
const cropPixels = (base64: string): RGBA[] => {
  const {data, height, width} = decodeBase64Jpg(base64);
  const pixels: RGBA[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      pixels.push([...data.slice(offset, offset + 4)] as RGBA);
    }
  }
  return pixels;
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
