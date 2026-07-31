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

import type {Point} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';

// One page of the standard Munsell Soil Color Book. Each printed page
// covers a single hue (e.g. '10YR') at 7 value rows and up to 6 chroma
// columns. Not every (value, chroma) cell exists on every page — the
// low-value / high-chroma corner is trimmed differently per hue.
//
// Layout invariants used elsewhere in the codebase:
//   - `chromas` is left-anchored: chipsPerRow[N] means "this row has
//     chipsPerRow[N] chips at chromas[0..chipsPerRow[N]-1]". Missing
//     chips are always the RIGHTMOST ones for a row.
//   - `values` and `chipsPerRow` have the same length (one entry per
//     chip row, top-to-bottom).
//   - All pages currently use the same chromas [1, 2, 3, 4, 6, 8].
//   - Row spacing is assumed uniform in the SAMPLE_GRID coord system
//     regardless of bottom-value (a 2.5-bottom page is treated as
//     having the same 7 evenly-spaced rows as a 2-bottom page). Verify
//     against the physical card; if some page has non-uniform spacing,
//     add a per-row-y hook to MunsellPage.
export type MunsellPage = {
  hue: string;
  values: readonly number[];
  chromas: readonly number[];
  chipsPerRow: readonly number[];
};

// The 9 Munsell Soil Color Book pages. Start with 10YR (the historical
// default this validator was built around); the other 8 hues are
// filled in as we get accurate chipsPerRow data for each printed page.
// The order below determines the dropdown order on the results screen.
export const MUNSELL_PAGES: readonly MunsellPage[] = [
  {
    hue: '10YR',
    values: [8, 7, 6, 5, 4, 3, 2],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [6, 6, 6, 6, 5, 5, 2],
  },
  {
    hue: '5R',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 6, 5],
  },
  {
    hue: '7.5R',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 6, 4],
  },
  {
    hue: '10R',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 5, 5, 2],
  },
  {
    hue: '2.5YR',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 5, 4],
  },
  {
    hue: '5YR',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 5, 4, 2],
  },
  {
    hue: '7.5YR',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [5, 6, 6, 6, 5, 4, 3],
  },
  {
    hue: '2.5Y',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [6, 6, 6, 5, 4, 3, 1],
  },
  {
    hue: '5Y',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [6, 6, 6, 5, 4, 2, 2],
  },
];

// Look up a page by hue string. Falls back to the first page (10YR)
// if the hue isn't found — used so a persisted "last-picked page" that
// doesn't exist any more doesn't crash the screen.
export const findMunsellPage = (hue: string): MunsellPage =>
  MUNSELL_PAGES.find(p => p.hue === hue) ?? MUNSELL_PAGES[0];

// One resolved chart cell — the union of the page's (value, chroma)
// coordinate and the pre-computed expected linear-sRGB for that
// notation. Replaces MunsellChartCell.
export type MunsellPageCell = {
  hue: string;
  value: number;
  chroma: number;
  notation: string;
  expectedLinearRgb: {r: number; g: number; b: number};
  // Position in the page's 7×6 chip grid. rowIdx=0 is the top (highest
  // value); colIdx=0 is the leftmost (lowest chroma).
  rowIdx: number;
  colIdx: number;
};

// Expand a page into its full cell list, one entry per PRESENT chip.
// Notation is `${hue} ${value}/${chroma}`; expected linear-sRGB comes
// from the munsell npm package (same source the 10YR-only code used).
// Sorted top-to-bottom, left-to-right — matches the physical chart and
// the on-screen result grid.
export const pageCells = (page: MunsellPage): MunsellPageCell[] => {
  const out: MunsellPageCell[] = [];
  page.values.forEach((value, rowIdx) => {
    const nChips = page.chipsPerRow[rowIdx];
    for (let colIdx = 0; colIdx < nChips; colIdx++) {
      const chroma = page.chromas[colIdx];
      const notation = `${page.hue} ${value}/${chroma}`;
      const [r, g, b] = munsellToLinearRgb(notation);
      out.push({
        hue: page.hue,
        value,
        chroma,
        notation,
        expectedLinearRgb: {r, g, b},
        rowIdx,
        colIdx,
      });
    }
  });
  return out;
};

// Chip-position template for a page, in the reference-grid coordinate
// system: (col * 2, row * 3 - 1.5). Chip row N sits half a row-step
// ABOVE hole row N (i.e., at y = row*3 - 1.5, where hole row 0 is at
// y=0). This is the per-page equivalent of the old universal
// SAMPLE_GRID — the union across all pages is a 7×6 = 42-point grid,
// each page selects the subset that has real chips.
export const pageSampleGridPoints = (page: MunsellPage): Point[] => {
  const out: Point[] = [];
  page.chipsPerRow.forEach((chipCount, chipRow) => {
    for (let col = 0; col < chipCount; col++) {
      out.push({x: col * 2, y: chipRow * 3 - 1.5});
    }
  });
  return out;
};

// Hole-position template for a page, in the reference-grid coordinate
// system: (col * 2, row * 3). A hole row lives BETWEEN two chip rows
// (below chip row N, above chip row N+1) and inherits its column count
// from the LOWER chip row (chipsPerRow[N+1]) — physically, each hole
// sits directly above the chip it compares to. There's no hole row
// above the top-most chip row (that's the chart's top edge), so the
// hole-row count is chipsPerRow.length - 1.
export const pageReferenceGridPoints = (page: MunsellPage): Point[] => {
  const out: Point[] = [];
  for (let holeRow = 0; holeRow < page.chipsPerRow.length - 1; holeRow++) {
    const nHoles = page.chipsPerRow[holeRow + 1];
    for (let col = 0; col < nHoles; col++) {
      out.push({x: col * 2, y: holeRow * 3});
    }
  }
  return out;
};

// Universal reference-grid template — the per-row MIN of hole counts
// across ALL pages in MUNSELL_PAGES. This is what the RANSAC anchor
// matcher fits against, so it doesn't need to know which page is being
// captured. Any real chart will contain at least these hole positions;
// the fitted affine works regardless.
//
// Assumes all pages have the same number of value rows (7 → 6 hole
// rows); throws if they don't, since a mixed-length page set breaks
// the min-per-row logic.
export const computeUniversalMinReferenceGrid = (
  pages: readonly MunsellPage[],
): Point[] => {
  if (pages.length === 0) return [];
  const nHoleRows = pages[0].chipsPerRow.length - 1;
  for (const p of pages) {
    if (p.chipsPerRow.length - 1 !== nHoleRows) {
      throw new Error(
        `MunsellPage ${p.hue} has ${p.chipsPerRow.length} chip rows; ` +
          `expected ${nHoleRows + 1} (all pages must have the same row count)`,
      );
    }
  }
  const out: Point[] = [];
  for (let row = 0; row < nHoleRows; row++) {
    let minCount = Infinity;
    for (const p of pages) {
      minCount = Math.min(minCount, p.chipsPerRow[row + 1]);
    }
    for (let col = 0; col < minCount; col++) {
      out.push({x: col * 2, y: row * 3});
    }
  }
  return out;
};

// Union across all pages — the widest possible chip grid. Used by the
// analyzer to sample once at every position that COULD have a chip on
// some page; each page then reads only the subset relevant to it.
export const computeUniversalMaxSampleGrid = (
  pages: readonly MunsellPage[],
): Point[] => {
  if (pages.length === 0) return [];
  const nChipRows = pages[0].chipsPerRow.length;
  const out: Point[] = [];
  for (let row = 0; row < nChipRows; row++) {
    let maxCount = 0;
    for (const p of pages) {
      maxCount = Math.max(maxCount, p.chipsPerRow[row]);
    }
    for (let col = 0; col < maxCount; col++) {
      out.push({x: col * 2, y: row * 3 - 1.5});
    }
  }
  return out;
};
