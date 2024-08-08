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

export type ValidColorResult = {result: MunsellColor};
export type InvalidColorResult = {
  invalidResult: MunsellColor;
  nearestValidResult: MunsellColor;
};
export type ColorResult = ValidColorResult | InvalidColorResult;
