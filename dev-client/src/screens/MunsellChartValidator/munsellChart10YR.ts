/*
 * Copyright © 2026 Technology Matters
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

import {munsellToLinearRgb} from 'munsell';

// Template for the standard NRCS Munsell Soil Color Chart page 10YR
// (Yellow-Red 10, the most-used soil-colour hue). Each cell in the
// grid is a swatch at a specific (value, chroma) coordinate; the
// physical card lays them out in a grid with white oval cutouts
// between rows for placing over soil.
//
// Positions here are in chart-normalized coordinates: (0, 0) is the
// top-left corner of the card body (the light-gray printed region),
// (1, 1) is the bottom-right corner. Auto-registration fits a
// homography to map these normalized coords into image pixel coords.
//
// The exact numeric layout was measured off a scan of a real chart
// page. Small errors are absorbed by the middle-1/4 sampling window
// used at decode time — being off by up to ~40% of a swatch's size
// still lands the sample inside the swatch.

export type MunsellChartCell = {
  // Munsell components. Hue is fixed at "10YR" for this page.
  value: number; // 2, 3, 4, 5, 6, 7, 8
  chroma: number; // 1, 2, 3, 4, 6, 8
  /**
   * Munsell notation as a string (e.g. "10YR 5/4") — what the
   * `munsell` package expects and returns.
   */
  notation: string;
  /**
   * Published/expected linear-sRGB triple for this notation, computed
   * once at module load via `munsellToLinearRgb`. Values are in
   * [0, 1], not clamped (out-of-gamut Munsell values are rare in the
   * soil range but can happen — the caller decides how to handle).
   */
  expectedLinearRgb: {r: number; g: number; b: number};
  /**
   * Chart-normalized centre of the swatch (u, v in [0, 1]). The
   * sampling window is centred here and sized to the middle 1/4 of a
   * swatch cell — see SWATCH_SAMPLE_HALF_* below.
   */
  u: number;
  v: number;
};

// Grid layout in chart-normalized coordinates. Measured off the card:
//   - Left legend (VALUE arrow + row labels): u ∈ [0.00, ~0.135]
//   - Top header (MUNSELL SOIL COLOR CHART / 10YR): v ∈ [0.00, ~0.055]
//   - Swatch grid body: u ∈ [~0.14, ~0.98], v ∈ [~0.06, ~0.94]
//   - Bottom legend (CHROMA arrow + column labels): v ∈ [~0.94, 1.00]
//
// Within a row, each grid cell contains a colored swatch (top ~55%)
// stacked with a white oval cutout (bottom ~45%). The swatch centre is
// therefore above the cell centre — vertically at ~27% down the row,
// not 50%.
const GRID_LEFT = 0.14;
const GRID_RIGHT = 0.98;
const GRID_TOP = 0.06;
const GRID_BOTTOM = 0.94;
const N_COLS = 6;
const N_ROWS = 7;
const SWATCH_V_OFFSET_IN_ROW = 0.27; // fraction of row height from row top

// Sampling window size relative to a full grid cell (u/v are in
// normalized chart coords). Middle 1/4 in each axis of the swatch area
// (not the whole cell), so we don't need pixel-perfect registration.
export const SWATCH_SAMPLE_HALF_U = 0.5 / N_COLS / 4;
export const SWATCH_SAMPLE_HALF_V = 0.55 / N_ROWS / 4;

// Columns: chroma = /1, /2, /3, /4, /6, /8 (note the /5 and /7 skips).
const CHROMAS: readonly number[] = [1, 2, 3, 4, 6, 8];
// Rows: value = 8/, 7/, ..., 2/. Top of chart is highest value.
const VALUES_TOP_TO_BOTTOM: readonly number[] = [8, 7, 6, 5, 4, 3, 2];

// Not every (value, chroma) exists on the physical chart. The standard
// NRCS 10YR page skips high-chroma cells at low values.
const PRESENT_CELLS: ReadonlySet<string> = new Set([
  // value 8
  '8/1',
  '8/2',
  '8/3',
  '8/4',
  '8/6',
  '8/8',
  // value 7
  '7/1',
  '7/2',
  '7/3',
  '7/4',
  '7/6',
  '7/8',
  // value 6
  '6/1',
  '6/2',
  '6/3',
  '6/4',
  '6/6',
  '6/8',
  // value 5
  '5/1',
  '5/2',
  '5/3',
  '5/4',
  '5/6',
  '5/8',
  // value 4 — no /8
  '4/1',
  '4/2',
  '4/3',
  '4/4',
  '4/6',
  // value 3 — no /8
  '3/1',
  '3/2',
  '3/3',
  '3/4',
  '3/6',
  // value 2 — only /1 and /2
  '2/1',
  '2/2',
]);

const colU = (colIdx: number): number => {
  const cellW = (GRID_RIGHT - GRID_LEFT) / N_COLS;
  return GRID_LEFT + cellW * (colIdx + 0.5);
};

const rowSwatchV = (rowIdx: number): number => {
  const cellH = (GRID_BOTTOM - GRID_TOP) / N_ROWS;
  return GRID_TOP + cellH * (rowIdx + SWATCH_V_OFFSET_IN_ROW);
};

// Build the full cell list once at module load. Sorted top-to-bottom,
// left-to-right — matches the visual layout of the physical card and
// the result grid we render at the end of an analysis run.
export const MUNSELL_10YR_CELLS: readonly MunsellChartCell[] = (() => {
  const out: MunsellChartCell[] = [];
  VALUES_TOP_TO_BOTTOM.forEach((value, rowIdx) => {
    CHROMAS.forEach((chroma, colIdx) => {
      if (!PRESENT_CELLS.has(`${value}/${chroma}`)) return;
      const notation = `10YR ${value}/${chroma}`;
      const [r, g, b] = munsellToLinearRgb(notation);
      out.push({
        value,
        chroma,
        notation,
        expectedLinearRgb: {r, g, b},
        u: colU(colIdx),
        v: rowSwatchV(rowIdx),
      });
    });
  });
  return out;
})();

// Chart aspect ratio (width / height) — the standard NRCS card is
// ~5:8 portrait. Used by the corner-detection pass to sanity-check
// whether the bright quadrilateral it found matches a chart.
export const CHART_ASPECT_RATIO = 5 / 8;

// Rows / cols enumerations exported for the result grid renderer,
// which lays cells out in a table that mirrors the physical chart.
export const CHART_VALUES = VALUES_TOP_TO_BOTTOM;
export const CHART_CHROMAS = CHROMAS;

export const CHART_HUE = '10YR';
