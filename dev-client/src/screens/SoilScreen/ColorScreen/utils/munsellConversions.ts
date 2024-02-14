import quantize from 'quantize';
import {
  SoilColorValue,
  colorChromas,
  colorHueSubsteps,
  colorHues,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {
  MUNSELL_TABLE,
  MunsellChroma,
  MunsellHue,
  MunsellValue,
  XYY,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/utils/munsellTable';

export const REFERENCES = {
  CAMERA_TRAX: [210.15, 213.95, 218.42],
  CANARY_POST_IT: [249.92, 242.07, 161.42],
  WHITE_BALANCE: [192.96, 192.0, 191.74],
} as const satisfies Record<string, RGB>;

const roundTo2 = (n: number) => parseFloat(n.toFixed(2));

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];
type LAB = [number, number, number];
type XYZ = [number, number, number];

const COLOR_COUNT = 16;

/* Math to transform RGB to LAB
   Credit to Bruce Lindbloom
   http://www.brucelindbloom.com/index.html?UPLab.html
    */
const RGBtoXYZ = (rgb: RGB): XYZ => {
  //Observer. = 2°, Illuminant = D65
  const [r, g, b] = rgb.map(v => {
    v = v / 255;
    if (v > 0.04045) {
      v = Math.pow((v + 0.055) / 1.055, 2.4);
    } else {
      v = v / 12.92;
    }
    return v * 100;
  });

  return [
    r * 0.4124 + g * 0.3576 + b * 0.1805,
    r * 0.2126 + g * 0.7152 + b * 0.0722,
    r * 0.0193 + g * 0.1192 + b * 0.9505,
  ];
};

const REF_XYZ = [95.047, 100.0, 108.883];
const XYZtoLAB = (xyz: XYZ): LAB => {
  const [x, y, z] = xyz.map((v, i) => {
    v = v / REF_XYZ[i];

    if (v > 0.008856) {
      v = Math.pow(v, 1 / 3);
    } else {
      v = v * 7.787 + 16 / 116;
    }
    return v;
  });

  // Return LAB values in an array
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)].map(roundTo2) as LAB;
};

const RGBtoLAB = (rgb: RGB) => XYZtoLAB(RGBtoXYZ(rgb));

const LABToMunsell = ([l, a, b]: LAB) => {
  const cab = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
  const hab = Math.atan2(b, a);
  var habDegrees = (180 / Math.PI) * hab;
  habDegrees = habDegrees % 360;

  const hueValue = (360 + 252 - habDegrees) % 360;
  let hueLetterIndex = Math.floor(hueValue / 36);
  const hueSubstep = (10 / 36) * (hueValue % 36);
  const colorHueSubstep =
    colorHueSubsteps[Math.floor((((hueSubstep + (10 - 1.25)) % 10) / 10) * 4)];
  if (hueSubstep < 1.25) {
    hueLetterIndex = (hueLetterIndex + 1) % 10;
  }
  if (hueLetterIndex >= 7) {
    return undefined;
  }
  const colorHue = colorHues[hueLetterIndex];

  // Munsell value can be approximated very accurately with a simple division by 10 Value = L/10;
  const value = l / 10;
  if (value <= 2 || value >= 10) {
    return undefined;
  }
  let colorValue: SoilColorValue;
  /* eslint-disable curly */
  if (value <= 2.75) colorValue = 'VALUE_2_5';
  else if (value <= 3.5) colorValue = 'VALUE_3';
  else if (value <= 4.5) colorValue = 'VALUE_4';
  else if (value <= 5.5) colorValue = 'VALUE_5';
  else if (value <= 6.5) colorValue = 'VALUE_6';
  else if (value <= 7.5) colorValue = 'VALUE_7';
  else if (value <= 8.25) colorValue = 'VALUE_8';
  else if (value <= 8.75) colorValue = 'VALUE_8_5';
  else if (value <= 9.25) colorValue = 'VALUE_9';
  else colorValue = 'VALUE_9_5';
  /* eslint-enable curly */

  //This Munsell chroma expression is a very rough approximation, but the best available
  const chroma = Math.round(cab / 5);
  if (chroma < 1 || chroma > 8) {
    return undefined;
  }
  const colorChroma = colorChromas[chroma - 1];

  return {colorHue, colorHueSubstep, colorChroma, colorValue};
}; //LAB2Munsell

export const munsellToRGB = (
  h: MunsellHue,
  v: MunsellValue,
  c: MunsellChroma,
): RGB | undefined => {
  const munsellInput = `${h} ${v} ${c}` as const;
  if (parseFloat(c) === 0) {
    const value = 255 * (parseFloat(v) / 10);
    return [value, value, value];
  }

  const xyy = MUNSELL_TABLE[munsellInput];
  return xyy ? rgb_delinearize(xyy_to_rgb_linear(xyy)) : undefined;
};

export const getColor = (
  pixelCard: RGBA[],
  pixelSoil: RGBA[],
  referenceRGB: RGB,
) => {
  const getPalette = (pixels: RGBA[]) => {
    //Transform pixel info from canvas so quantize can use it
    const pixelArray = pixels.flatMap(([r, g, b, a]) => {
      // If pixel is mostly opaque and not white
      if (a >= 125) {
        if (!(r > 250 && g > 250 && b > 250)) {
          return [[r, g, b] as quantize.RgbPixel];
        }
      }
      return [];
    });
    //Quantize.js performs median cut algorithm, and returns a palette of the "top 16" colors in the picture
    var cmap = quantize(pixelArray, COLOR_COUNT);
    return cmap ? cmap.palette() : null;
  };

  //Get the color palettes of both soil and card
  const paletteCard = getPalette(pixelCard);
  const paletteSample = getPalette(pixelSoil);

  if (!paletteCard || !paletteSample) {
    return undefined;
  }

  //Correction values obtain from spectrophotometer Observer. = 2°, Illuminant = D65
  const correctSampleRGB = (cardPixel: RGB, samplePixel: RGB) => {
    const corrected = cardPixel.map(
      (cardV, index) => (referenceRGB[index] / cardV) * samplePixel[index],
    ) as RGB;

    return {
      rgb: corrected,
      lab: RGBtoLAB(corrected),
      rgbRaw: samplePixel,
    };
  };

  const sample = correctSampleRGB(paletteCard[0], paletteSample[0]);

  return {
    ...sample,
    munsell: LABToMunsell(sample.lab),
  };
};

const rgb_delinearize = (rgb: RGB): RGB =>
  rgb
    .map(v => {
      if (v <= 0.0031308) {
        return 12.92 * v;
      } else {
        return 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055;
      }
    })
    .map(v => 255 * v) as RGB;

const xyy_to_rgb_linear = ([x, y, y2]: XYY): RGB => {
  if (Math.abs(y) < 1e-100) {
    y = 1e-100;
  }
  y2 /= 100;
  var x2 = (y2 * x) / y;
  var z2 = (y2 * (1 - x - y)) / y;
  return [
    3.2406 * x2 - 1.5372 * y2 - 0.4986 * z2,
    -0.9689 * x2 + 1.8758 * y2 + 0.0415 * z2,
    0.0557 * x2 - 0.204 * y2 + 1.057 * z2,
  ];
};
