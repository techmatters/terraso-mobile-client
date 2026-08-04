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

// One page of the Munsell Soil Color Book. Every page shares the SAME
// physical hole/chip grid (up to 7 chip rows × 6 chip cols) — each
// specific page just fills in a subset of that grid. Three variations
// exist and are handled uniformly here:
//
//   - Traditional single-hue pages (10YR, 5R, 5YR, ...): every chip
//     inherits `page.name` as its Munsell hue; rows = value, cols =
//     chroma.
//   - Mixed-hue pages (10Y-5GY, GLEY1, GLEY2): rows = value, cols =
//     chroma, but each column carries its own hue via `columnHues[N]`
//     — so column N shows page.name at value×columnHues[N]/chromas[N].
//   - The WHITE page: rows are labelled by (hue, chroma) pairs
//     (`rowLabels`), columns are values. `layout: 'white'` selects
//     that interpretation.
//
// Empty leading rows / columns:
//   - Set `firstChipRow = k` when the first DATA row of the page sits
//     at physical row k (so k physical rows above it are empty).
//     `values` / `rowLabels` / `chipsPerRow` all describe just the
//     DATA rows — no leading zeros or placeholders. 10Y-5GY skips
//     physical rows 0 and 1 → firstChipRow=2.
//   - Set `firstChipCol = k` symmetrically for empty leading columns
//     (10Y-5GY and WHITE both skip physical column 0 → firstChipCol=1).
//     `chromas` / `columnHues` (and for WHITE `values`) describe just
//     the DATA columns.
//   - `chipsPerRow[i]` still says "row i has N chips" and can be 0 if
//     a specific DATA row happens to be blank (uncommon), but you no
//     longer need [0, 0, 4, 4, ...] to skip empty leading rows —
//     that's what firstChipRow is for.
export type MunsellPage = {
  // Human-facing page identifier — used in the dropdown, AppBar
  // title, and log lines. For traditional pages, this is the intrinsic
  // Munsell hue every chip inherits. For mixed-hue and WHITE pages
  // it's a label; per-chip hues come from columnHues / rowLabels.
  name: string;
  // For 'standard' layout: value per physical row. Length must equal
  // chipsPerRow.length (one entry per physical row).
  // For 'white' layout: value per column. Length must equal the max
  // chipsPerRow[i] across all rows.
  values: readonly number[];
  // Chroma per column, for 'standard' layout only. Length = number of
  // chip columns present on the page (usually 6 for traditional,
  // fewer for mixed-hue). Unused for 'white'.
  chromas: readonly number[];
  // Per-column hue for 'standard' layout with mixed hues. Length must
  // equal chromas.length when provided. When omitted every chip
  // inherits page.name. Unused for 'white'.
  columnHues?: readonly string[];
  // Chip count per PHYSICAL row (left-anchored within the row's chip
  // strip that starts at physical column firstChipCol). Length = 7
  // for the standard soil-color book; empty rows have entry 0.
  chipsPerRow: readonly number[];
  // 'standard' (default): rows = value, cols = chroma.
  // 'white': rows = (hue, chroma) pair (see rowLabels), cols = value.
  layout?: 'standard' | 'white';
  // Required when layout === 'white'. One entry per physical row —
  // (hue, chroma) for chips in that row. Length must equal
  // chipsPerRow.length.
  rowLabels?: readonly {hue: string; chroma: number}[];
  // Physical column where each row's chip strip starts. Default 0.
  // Set to 1 for pages whose leftmost physical column is empty
  // (10Y-5GY, WHITE). All chip / hole geometry accounts for it, so
  // the same 7×6 gridRegistration handles every page without knowing
  // which one it's looking at.
  firstChipCol?: number;
  // Physical row where the first DATA row lands. Default 0. Set to a
  // positive integer to skip empty leading rows (10Y-5GY skips
  // physical rows 0 and 1 → firstChipRow=2). values, chipsPerRow,
  // rowLabels index only the DATA rows; pageSampleGridPoints /
  // pageReferenceGridPoints add firstChipRow to compute physical y
  // in template coordinates.
  firstChipRow?: number;
};

// Every page currently registered with the validator. Order determines
// dropdown order on the results screen. New pages after 5Y use the
// firstChipCol / mixed-hue / white-layout features documented on the
// MunsellPage type.
export const MUNSELL_PAGES: readonly MunsellPage[] = [
  {
    name: '10YR',
    values: [8, 7, 6, 5, 4, 3, 2],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [6, 6, 6, 6, 5, 5, 2],
  },
  {
    name: '5R',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 6, 5],
  },
  {
    name: '7.5R',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 6, 4],
  },
  {
    name: '10R',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 5, 2],
  },
  {
    name: '2.5YR',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 6, 5, 4],
  },
  {
    name: '5YR',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [4, 6, 6, 6, 5, 4, 2],
  },
  {
    name: '7.5YR',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [5, 6, 6, 6, 5, 4, 3],
  },
  {
    name: '2.5Y',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [6, 6, 6, 5, 4, 3, 1],
  },
  {
    name: '5Y',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 2, 3, 4, 6, 8],
    chipsPerRow: [6, 6, 6, 5, 4, 2, 2],
  },
  // Mixed-hue: 4 data columns (10Y at chromas 2 & 4, 5GY at chromas
  // 2 & 4). Top two physical rows are empty (values 8 and 7 don't
  // exist on this page); data rows are 6/5/4/3. firstChipCol=1 —
  // physical column 0 is empty like on WHITE.
  // TODO: verify the exact per-column (hue, chroma) split and the
  // populated row range against the physical card (currently guessed
  // as [10Y/2, 10Y/4, 5GY/2, 5GY/4]).
  {
    name: '10Y-5GY',
    // 4 data rows starting at physical row 2 (physical rows 0/1 are
    // empty — chart has no value-8 or value-7 chips), and 4 data
    // columns starting at physical column 1.
    values: [6, 5, 4, 3],
    chromas: [2, 4, 2, 4],
    columnHues: ['10Y', '10Y', '5GY', '5GY'],
    chipsPerRow: [4, 4, 4, 4],
    firstChipCol: 1,
    firstChipRow: 2,
  },
  // TODO: verify GLEY1 layout against the physical card.
  {
    name: 'GLEY1',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [0, 1, 1, 1],
    columnHues: ['N', '10Y', '5GY', '10GY'],
    chipsPerRow: [4, 4, 4, 4, 4, 4, 4],
    firstChipCol: 1,
  },
  // TODO: verify GLEY2 layout against the physical card.
  {
    name: 'GLEY2',
    values: [8, 7, 6, 5, 4, 3, 2.5],
    chromas: [1, 1, 1, 1],
    columnHues: ['5G', '10G', '5BG', '10BG'],
    chipsPerRow: [4, 4, 4, 4, 4, 4, 4],
    firstChipCol: 1,
  },
  // WHITE page. Transposed axes: rows are (hue, chroma) pairs, cols
  // are values. Same 7 physical rows and same chip-column widths as
  // standard pages, but starts at physical column 1 (firstChipCol=1)
  // — the leftmost physical column is empty. 4 chip columns per row,
  // one per value.
  {
    name: 'WHITE',
    layout: 'white',
    values: [9.5, 9, 8.5, 8],
    chromas: [], // unused for 'white' layout
    rowLabels: [
      {hue: 'N', chroma: 0},
      {hue: '7.5YR', chroma: 1},
      {hue: '7.5YR', chroma: 2},
      {hue: '10YR', chroma: 1},
      {hue: '10YR', chroma: 2},
      {hue: '2.5Y', chroma: 1},
      {hue: '2.5Y', chroma: 2},
    ],
    chipsPerRow: [4, 4, 4, 4, 4, 4, 4],
    firstChipCol: 1,
  },
];

// Look up a page by name string. Falls back to the first page (10YR)
// if the name isn't found — used so a persisted "last-picked page"
// that no longer exists doesn't crash the screen.
export const findMunsellPage = (name: string): MunsellPage =>
  MUNSELL_PAGES.find(p => p.name === name) ?? MUNSELL_PAGES[0];

// One resolved chart cell — the union of the page's (hue, value,
// chroma) coordinate and the pre-computed expected linear-sRGB for
// that Munsell notation.
export type MunsellPageCell = {
  hue: string;
  value: number;
  chroma: number;
  notation: string;
  expectedLinearRgb: {r: number; g: number; b: number};
  // PHYSICAL position in the 7×6 chip grid. rowIdx = physical row
  // (matches page.chipsPerRow[rowIdx] and grid.centers[rowIdx]).
  // colIdx = physical column (accounts for firstChipCol and matches
  // grid.centers[rowIdx][colIdx]). Two cells with the same
  // (rowIdx, colIdx) are impossible by construction.
  rowIdx: number;
  colIdx: number;
};

// Resolve the (hue, value, chroma) for a given (data-row, data-col)
// position, dispatching on layout. Both indices are 0-based into the
// DATA arrays (values / chromas / rowLabels), not physical positions —
// firstChipRow / firstChipCol are applied by the caller when emitting
// physical grid coordinates.
const resolveCellCoord = (
  page: MunsellPage,
  dataRow: number,
  dataCol: number,
): {hue: string; value: number; chroma: number} => {
  const layout = page.layout ?? 'standard';
  if (layout === 'white') {
    const row = page.rowLabels?.[dataRow];
    if (!row) {
      throw new Error(
        `MunsellPage ${page.name}: layout='white' but rowLabels[${dataRow}] missing`,
      );
    }
    const value = page.values[dataCol];
    if (value === undefined) {
      throw new Error(
        `MunsellPage ${page.name}: layout='white' but values[${dataCol}] missing`,
      );
    }
    return {hue: row.hue, value, chroma: row.chroma};
  }
  // standard
  const value = page.values[dataRow];
  const chroma = page.chromas[dataCol];
  const hue = page.columnHues?.[dataCol] ?? page.name;
  return {hue, value, chroma};
};

// Expand a page into its full cell list, one entry per PRESENT chip.
// Notation is `${hue} ${value}/${chroma}`; expected linear-sRGB
// comes from the munsell npm package. Sorted top-to-bottom,
// left-to-right — matches the physical chart and the on-screen
// result grid. Emitted cells carry PHYSICAL (rowIdx, colIdx) so
// downstream grid.centers lookups work directly with them.
export const pageCells = (page: MunsellPage): MunsellPageCell[] => {
  const firstCol = page.firstChipCol ?? 0;
  const firstRow = page.firstChipRow ?? 0;
  const out: MunsellPageCell[] = [];
  page.chipsPerRow.forEach((nChips, dataRow) => {
    for (let dataCol = 0; dataCol < nChips; dataCol++) {
      const {hue, value, chroma} = resolveCellCoord(page, dataRow, dataCol);
      const notation = `${hue} ${value}/${chroma}`;
      const [r, g, b] = munsellToLinearRgb(notation);
      out.push({
        hue,
        value,
        chroma,
        notation,
        expectedLinearRgb: {r, g, b},
        rowIdx: firstRow + dataRow,
        colIdx: firstCol + dataCol,
      });
    }
  });
  return out;
};

// Chip-position template for a page, in the reference-grid coordinate
// system: (physicalCol * 2, physicalRow * 3 - 1.5). Chip row N sits
// half a row-step ABOVE hole row N. Physical row/col account for
// firstChipRow / firstChipCol so a page skipping physical row 0 or
// column 0 emits chips starting at the right offset instead of at 0.
export const pageSampleGridPoints = (page: MunsellPage): Point[] => {
  const firstCol = page.firstChipCol ?? 0;
  const firstRow = page.firstChipRow ?? 0;
  const out: Point[] = [];
  page.chipsPerRow.forEach((chipCount, dataRow) => {
    const physicalRow = firstRow + dataRow;
    for (let dataCol = 0; dataCol < chipCount; dataCol++) {
      out.push({x: (firstCol + dataCol) * 2, y: physicalRow * 3 - 1.5});
    }
  });
  return out;
};

// Hole-position template for a page, in the reference-grid coordinate
// system: (physicalCol * 2, physicalHoleRow * 3). A hole row lives
// BETWEEN two chip rows (below chip row N, above chip row N+1). A
// hole exists at (row, col) only when BOTH adjacent chip strips have
// a chip at that column, so nHoles = min(chipsPerRow[N],
// chipsPerRow[N+1]). Both physical row and physical column account
// for firstChipRow / firstChipCol.
//
// Previously used just chipsPerRow[N+1] (the LOWER row) which was
// correct for pages where the top row is complete (e.g. 10YR has 6
// chips top→bottom) but wrong for pages like 5R whose TOP row is
// short — the code invented phantom holes at hole-row 0.
export const pageReferenceGridPoints = (page: MunsellPage): Point[] => {
  const firstCol = page.firstChipCol ?? 0;
  const firstRow = page.firstChipRow ?? 0;
  const out: Point[] = [];
  for (
    let dataHoleRow = 0;
    dataHoleRow < page.chipsPerRow.length - 1;
    dataHoleRow++
  ) {
    const nHoles = Math.min(
      page.chipsPerRow[dataHoleRow],
      page.chipsPerRow[dataHoleRow + 1],
    );
    const physicalHoleRow = firstRow + dataHoleRow;
    for (let dataCol = 0; dataCol < nHoles; dataCol++) {
      out.push({x: (firstCol + dataCol) * 2, y: physicalHoleRow * 3});
    }
  }
  return out;
};

// Universal reference grid — union across ALL registered pages, of
// every physical (col, holeRow) position that any page has a hole
// at. Used as the fallback reference grid for RANSAC when the caller
// doesn't hand one in. Extra positions that no page has cost nothing
// (the fit just doesn't find a matching detection there).
//
// Handles heterogeneous chipsPerRow counts, firstChipCol shifts,
// and 'white' layout uniformly by walking each page's own hole-
// position template.
export const computeUniversalMaxReferenceGrid = (
  pages: readonly MunsellPage[],
): Point[] => {
  return dedupPoints(pages.flatMap(pageReferenceGridPoints));
};

// Historical MIN (intersection) variant — kept for reference. Now
// computed as the intersection of per-page hole templates.
export const computeUniversalMinReferenceGrid = (
  pages: readonly MunsellPage[],
): Point[] => {
  if (pages.length === 0) return [];
  const perPage = pages.map(
    p => new Set(pageReferenceGridPoints(p).map(pointKey)),
  );
  const first = perPage[0];
  const inAll = Array.from(first).filter(k => perPage.every(s => s.has(k)));
  return inAll
    .map(unpointKey)
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
};

// Universal sample grid — union across ALL registered pages, of
// every physical (col, chipRow) chip position that any page has.
// Same rationale as the reference grid; also uniform across layouts
// and firstChipCol via per-page pageSampleGridPoints.
export const computeUniversalMaxSampleGrid = (
  pages: readonly MunsellPage[],
): Point[] => {
  return dedupPoints(pages.flatMap(pageSampleGridPoints));
};

// Point-set utilities — the universal grid computations need a
// stable string key to dedupe / intersect points that were produced
// independently by per-page templates.
const pointKey = (p: Point): string => `${p.x},${p.y}`;
const unpointKey = (k: string): Point => {
  const [x, y] = k.split(',').map(Number);
  return {x, y};
};
const dedupPoints = (points: readonly Point[]): Point[] => {
  const seen = new Set<string>();
  const out: Point[] = [];
  for (const p of points) {
    const k = pointKey(p);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
};
