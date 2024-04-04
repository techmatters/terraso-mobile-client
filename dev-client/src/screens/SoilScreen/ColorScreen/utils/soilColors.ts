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

import {
  ColorChroma,
  ColorHueSubstep,
  ColorValue,
  SoilColorHue,
  colorChromas,
  colorHueSubsteps,
  colorValues,
  nonNeutralColorHues,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {entries} from 'terraso-client-shared/utils';

/* this was originally nested objects, which was easier to read, but apparently
 * Object.entries converts number keys to strings so it was causing issues
 */

export type MHVC = readonly [number, number, number];
export const SOIL_COLORS: Record<
  SoilColorHue,
  [ColorHueSubstep | 0, [ColorValue, (ColorChroma | 0)[]][]][]
> = {
  R: [
    [
      5,
      [
        [2.5, [1, 2, 3, 4, 6]],
        [3, [1, 2, 3, 4, 6, 8]],
        [4, [1, 2, 3, 4, 6, 8]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4]],
      ],
    ],
    [
      7.5,
      [
        [2.5, [1, 2, 3, 4]],
        [3, [1, 2, 3, 4, 6, 8]],
        [4, [1, 2, 3, 4, 6, 8]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4]],
      ],
    ],
    [
      10,
      [
        [2.5, [1, 2]],
        [3, [1, 2, 3, 4, 6]],
        [4, [1, 2, 3, 4, 6, 8]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4]],
      ],
    ],
  ],
  YR: [
    [
      2.5,
      [
        [2.5, [1, 2, 3, 4]],
        [3, [1, 2, 3, 4, 6]],
        [4, [1, 2, 3, 4, 6, 8]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4]],
      ],
    ],
    [
      5,
      [
        [2.5, [1, 2]],
        [3, [1, 2, 3, 4]],
        [4, [1, 2, 3, 4, 6]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4]],
      ],
    ],
    [
      7.5,
      [
        [2.5, [1, 2, 3]],
        [3, [1, 2, 3, 4]],
        [4, [1, 2, 3, 4, 6]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4, 6]],
        [8.5, [1, 2]],
        [9, [1, 2]],
        [9.5, [1, 2]],
      ],
    ],
    [
      10,
      [
        [2, [1, 2]],
        [3, [1, 2, 3, 4, 6]],
        [4, [1, 2, 3, 4, 6]],
        [5, [1, 2, 3, 4, 6, 8]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4, 6, 8]],
        [8.5, [1, 2]],
        [9, [1, 2]],
        [9.5, [1, 2]],
      ],
    ],
  ],
  Y: [
    [
      2.5,
      [
        [2.5, [1]],
        [3, [1, 2, 3]],
        [4, [1, 2, 3, 4]],
        [5, [1, 2, 3, 4, 6]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4, 6, 8]],
        [8.5, [1, 2]],
        [9, [1, 2]],
        [9.5, [1, 2]],
      ],
    ],
    [
      5,
      [
        [2.5, [1, 2]],
        [3, [1, 2]],
        [4, [1, 2, 3, 4]],
        [5, [1, 2, 3, 4, 6]],
        [6, [1, 2, 3, 4, 6, 8]],
        [7, [1, 2, 3, 4, 6, 8]],
        [8, [1, 2, 3, 4, 6, 8]],
      ],
    ],
    [
      10,
      [
        [2.5, [1]],
        [3, [1, 2, 4]],
        [4, [1, 2, 4]],
        [5, [1, 2, 4]],
        [6, [1, 2, 4]],
        [7, [1]],
        [8, [1]],
      ],
    ],
  ],
  GY: [
    [
      5,
      [
        [2.5, [1]],
        [3, [1, 2, 4]],
        [4, [1, 2, 4]],
        [5, [1, 2, 4]],
        [6, [1, 2, 4]],
        [7, [1]],
        [8, [1]],
      ],
    ],
    [
      10,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
  ],
  G: [
    [
      5,
      [
        [2.5, [1, 2]],
        [3, [1, 2]],
        [4, [1, 2]],
        [5, [1, 2]],
        [6, [1, 2]],
        [7, [1, 2]],
        [8, [1, 2]],
      ],
    ],
    [
      10,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
  ],
  BG: [
    [
      5,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
    [
      10,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
  ],
  B: [
    [
      5,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
    [
      10,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
  ],
  PB: [
    [
      5,
      [
        [2.5, [1]],
        [3, [1]],
        [4, [1]],
        [5, [1]],
        [6, [1]],
        [7, [1]],
        [8, [1]],
      ],
    ],
  ],
  N: [
    [
      0,
      [
        [2.5, [0]],
        [3, [0]],
        [4, [0]],
        [5, [0]],
        [6, [0]],
        [7, [0]],
        [8, [0]],
        [8.5, [0]],
        [9, [0]],
        [9.5, [0]],
      ],
    ],
  ],
} as const;

export const validComponents = (color: {
  hue: SoilColorHue | null;
  substep: ColorHueSubstep | null;
  value: ColorValue | null;
}) => {
  if (color.hue === null) {
    return {
      substeps: colorHueSubsteps,
      values: colorValues,
      chromas: colorChromas,
    };
  }

  const substeps = SOIL_COLORS[color.hue].flatMap(([substep, _]) =>
    substep === 0 ? [] : [substep],
  );

  if (color.substep === null) {
    const allValues = new Set<ColorValue>();
    const allChromas = new Set<ColorChroma>();
    for (const [_, valueChromas] of SOIL_COLORS[color.hue]) {
      for (const [value, chromas] of valueChromas) {
        allValues.add(value);
        for (const chroma of chromas) {
          if (chroma !== 0) {
            allChromas.add(chroma);
          }
        }
      }
    }

    return {
      substeps,
      values: [...allValues.keys()].sort(),
      chromas: [...allChromas.keys()].sort(),
    };
  }

  const valueChromas = SOIL_COLORS[color.hue].find(
    ([substep, _]) => substep === color.substep,
  )![1];

  const values = valueChromas.map(([value, _]) => value);

  if (color.value === null) {
    const allChromas = new Set<ColorChroma>();
    for (const [_, chromas] of valueChromas) {
      for (const chroma of chromas) {
        if (chroma !== 0) {
          allChromas.add(chroma);
        }
      }
    }
    return {
      substeps,
      values: values,
      chromas: [...allChromas.keys()].sort(),
    };
  }

  const chromas = valueChromas.find(([value, _]) => value === color.value)![1];

  return {substeps, values, chromas};
};

export const isValidSubstepFor = (color: {
  hue: SoilColorHue | null;
  substep: ColorHueSubstep | null;
}) => {
  return (
    color.substep === null ||
    validComponents({
      hue: color.hue,
      substep: null,
      value: null,
    }).substeps.includes(color.substep)
  );
};

export const isValidValueFor = (color: {
  hue: SoilColorHue | null;
  substep: ColorHueSubstep | null;
  value: ColorValue | null;
}) => {
  return (
    color.value === null ||
    validComponents({...color, value: null}).values.includes(color.value)
  );
};

export const isValidChromaFor = (color: {
  hue: SoilColorHue | null;
  substep: ColorHueSubstep | null;
  value: ColorValue | null;
  chroma: ColorChroma | null;
}) => {
  return (
    color.chroma === null ||
    validComponents(color).chromas.includes(color.chroma)
  );
};

export const FLATTENED_SOIL_COLORS: MHVC[] = entries(SOIL_COLORS).flatMap(
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
