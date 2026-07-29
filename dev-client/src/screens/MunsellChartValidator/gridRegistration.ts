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

import {
  blobAspect,
  blobFillRatio,
  blobH,
  blobW,
  connectedComponents,
  threshold,
  type Blob,
  type GrayImage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';
import {
  CHART_CHROMAS,
  CHART_VALUES,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';

// Grid-based registration: instead of finding the chart body via
// "largest bright blob" (fragile — white paper behind the chart reads
// brighter than the chart itself), find the SWATCHES directly. They're
// the most distinctive feature of the chart: ~32 dark-ish rectangles
// arranged in a strict 6-column × 7-row grid. Once we've located them
// we know exactly where every cell is — no separate homography step.
//
// The detected grid may be incomplete (light-value swatches — value 7
// and 8 — can be brighter than our dark-threshold cut-off). We
// extrapolate the missing rows/cols using the median inter-row and
// inter-col spacing of what WAS detected, on the assumption that
// physical chart cell spacing is uniform (which it is).

// One filled grid entry — a swatch we located in the image, together
// with the (row, col) it maps to in the template.
export type GridEntry = {
  rowIdx: number; // index into CHART_VALUES
  colIdx: number; // index into CHART_CHROMAS
  cx: number; // preview-space centre X
  cy: number; // preview-space centre Y
};

// Per-cell fitted position in preview-space pixels. `centers[r][c]`
// gives the fitted swatch centre for template cell
// (CHART_VALUES[r], CHART_CHROMAS[c]).
export type CellCenters = {x: number; y: number}[][];

export type GridDetection = {
  centers: CellCenters;
  // Approximate swatch pixel size (typical spacing between adjacent
  // cells, along each axis after the affine fit). Used by callers to
  // compute the sampling window without any further shape detection.
  cellW: number;
  cellH: number;
  // Diagnostic: which grid positions were directly detected (as
  // opposed to affine-extrapolated). Rendered as dots on the "Source
  // + ROIs" validation view.
  detected: GridEntry[];
};

// Tunables. Values chosen for a ~1200-wide preview and a chart that
// fills a substantial portion of the frame — see comments below.
const DARK_THRESHOLD = 140;
// A detected blob is a candidate swatch if:
//   - its area (pixel count) is in this range
//   - its aspect ratio is roughly rectangular
//   - it fills its bounding box densely (rules out ring/text shapes)
// Numbers here are for a 1200-wide preview; scaled per image below.
const MIN_AREA_FRAC = 0.001; // ~ (chart_frac × swatch_frac²) — very permissive
const MAX_AREA_FRAC = 0.02; // ~2% of frame is roughly a big swatch
const MAX_ASPECT = 2.2;
const MIN_FILL_RATIO = 0.7;

export const detectChartByGrid = (img: GrayImage): GridDetection | null => {
  // 1. Isolate dark regions. Swatches at value ≤ 5 are much darker
  //    than the chart body; text and cutout-on-soil are too, but the
  //    shape filter below prunes non-swatch shapes.
  const mask = threshold(img, DARK_THRESHOLD, /*invert*/ true);
  const blobs = connectedComponents(mask);

  // 2. Filter for swatch-shaped blobs.
  const totalPixels = img.width * img.height;
  const minArea = Math.max(50, MIN_AREA_FRAC * totalPixels);
  const maxArea = MAX_AREA_FRAC * totalPixels;
  const candidates = blobs.filter(b => {
    if (b.area < minArea || b.area > maxArea) return false;
    if (blobAspect(b) > MAX_ASPECT) return false;
    if (blobFillRatio(b) < MIN_FILL_RATIO) return false;
    // Sanity: swatches are much wider than a single-character text
    // stroke. Bounding box shorter dim should be at least 8px.
    if (Math.min(blobW(b), blobH(b)) < 8) return false;
    return true;
  });
  if (candidates.length < 6) return null;

  // 3. Cluster by y → rows, by x → cols. Merge tolerance is derived
  //    from the median blob height/width so it scales with capture
  //    resolution.
  const medianH = median(candidates.map(b => blobH(b)));
  const medianW = median(candidates.map(b => blobW(b)));
  const rowClusters = clusterByAxis(candidates, b => b.cy, medianH * 0.6);
  const colClusters = clusterByAxis(candidates, b => b.cx, medianW * 0.6);
  if (rowClusters.length < 2 || colClusters.length < 2) return null;

  // 4. Sort the row / col clusters by their centres so we can map
  //    them to template indices deterministically.
  const rowClusterCenters = rowClusters
    .map(r => median(r.map(b => b.cy)))
    .sort((a, b) => a - b);
  const colClusterCenters = colClusters
    .map(c => median(c.map(b => b.cx)))
    .sort((a, b) => a - b);

  // 5. Assign template (rowIdx, colIdx) to each detected blob.
  //
  // Row assumption: we captured dark swatches. Dark swatches are at
  // lower Munsell values (2..5); light swatches (6..8) often slip
  // below the threshold. So a partial row-detection almost always
  // means "detected the bottom N rows, missing the top ones".
  // Match: bottommost detected row cluster → template row idx = last
  // (value 2), next-up → last-1 (value 3), and so on.
  //
  // Column assumption: every value row has at least the low-chroma
  // (dark neutral) columns, so a full 6-column detection is usual.
  // Partial: assume detected cols are the leftmost (low chromas).
  const rowOffset = CHART_VALUES.length - rowClusterCenters.length;
  const colOffset = 0;
  const detected: GridEntry[] = candidates
    .map(b => {
      const rowIdxDetected = nearestIndex(rowClusterCenters, b.cy);
      const colIdxDetected = nearestIndex(colClusterCenters, b.cx);
      return {
        rowIdx: rowOffset + rowIdxDetected,
        colIdx: colOffset + colIdxDetected,
        cx: b.cx,
        cy: b.cy,
      };
    })
    // Discard any blobs that fell so far from their nearest cluster
    // centre they'd distort the affine fit — happens for spurious
    // dark blobs on the paper background.
    .filter(e => {
      const cx = colClusterCenters[e.colIdx - colOffset];
      const cy = rowClusterCenters[e.rowIdx - rowOffset];
      const dx = Math.abs(e.cx - cx);
      const dy = Math.abs(e.cy - cy);
      return dx < medianW && dy < medianH;
    });

  if (detected.length < 6) return null;

  // 6. Fit an affine transform (col, row) → (px, py). Handles chart
  //    rotation, shear, non-uniform scaling — everything you get from
  //    a not-perfectly-square-on capture. Two independent 3-parameter
  //    least-squares fits (one for X, one for Y).
  const xCoeffs = leastSquares3(detected.map(d => [d.colIdx, d.rowIdx, d.cx]));
  const yCoeffs = leastSquares3(detected.map(d => [d.colIdx, d.rowIdx, d.cy]));
  if (!xCoeffs || !yCoeffs) return null;

  // 7. Materialise the full 7×6 grid using the fitted transform.
  const centers: CellCenters = [];
  for (let r = 0; r < CHART_VALUES.length; r++) {
    const row: {x: number; y: number}[] = [];
    for (let c = 0; c < CHART_CHROMAS.length; c++) {
      row.push({
        x: xCoeffs[0] * c + xCoeffs[1] * r + xCoeffs[2],
        y: yCoeffs[0] * c + yCoeffs[1] * r + yCoeffs[2],
      });
    }
    centers.push(row);
  }

  // Cell size = magnitude of the col-step vector (for width) and
  // row-step vector (for height). These come straight from the
  // fitted affine, so they respect the chart's actual scale in the
  // capture — including rotation.
  const cellW = Math.hypot(xCoeffs[0], yCoeffs[0]);
  const cellH = Math.hypot(xCoeffs[1], yCoeffs[1]);

  return {centers, cellW, cellH, detected};
};

// Least-squares solver for `a*x1 + b*x2 + c = y` given a list of
// [x1, x2, y] samples. Builds the 3×3 normal equation system and
// solves via Gaussian elimination. Returns null if the system is
// singular (all samples collinear).
const leastSquares3 = (
  samples: readonly [number, number, number][],
): [number, number, number] | null => {
  // Accumulate sums for the normal equations:
  //   [Sxx  Sxy  Sx ] [a]   [Sxz]
  //   [Sxy  Syy  Sy ] [b] = [Syz]
  //   [Sx   Sy   N  ] [c]   [Sz ]
  let Sxx = 0,
    Sxy = 0,
    Sx = 0,
    Syy = 0,
    Sy = 0,
    N = 0,
    Sxz = 0,
    Syz = 0,
    Sz = 0;
  for (const [x1, x2, z] of samples) {
    Sxx += x1 * x1;
    Sxy += x1 * x2;
    Sx += x1;
    Syy += x2 * x2;
    Sy += x2;
    N += 1;
    Sxz += x1 * z;
    Syz += x2 * z;
    Sz += z;
  }
  const A: number[][] = [
    [Sxx, Sxy, Sx, Sxz],
    [Sxy, Syy, Sy, Syz],
    [Sx, Sy, N, Sz],
  ];
  try {
    const [a, b, c] = solve3x3(A);
    return [a, b, c];
  } catch {
    return null;
  }
};

// Gaussian elimination on a 3×4 augmented matrix. Throws on singular.
const solve3x3 = (A: number[][]): [number, number, number] => {
  const M = A.map(row => [...row]);
  for (let i = 0; i < 3; i++) {
    let pivot = i;
    let pivotVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < 3; k++) {
      const v = Math.abs(M[k][i]);
      if (v > pivotVal) {
        pivotVal = v;
        pivot = k;
      }
    }
    if (pivotVal < 1e-12) throw new Error('Singular');
    if (pivot !== i) {
      const tmp = M[i];
      M[i] = M[pivot];
      M[pivot] = tmp;
    }
    for (let k = 0; k < 3; k++) {
      if (k === i) continue;
      const factor = M[k][i] / M[i][i];
      if (factor === 0) continue;
      for (let j = i; j <= 3; j++) M[k][j] -= factor * M[i][j];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
};

// ---------------------------------------------------------------------------
// Small helpers.

// One-dimensional gap-based clustering. Sort by axis; open a new
// cluster whenever consecutive values differ by more than `gap`.
// Returns the ORIGINAL blob objects grouped by cluster.
const clusterByAxis = (
  blobs: Blob[],
  axis: (b: Blob) => number,
  gap: number,
): Blob[][] => {
  if (blobs.length === 0) return [];
  const sorted = [...blobs].sort((a, b) => axis(a) - axis(b));
  const clusters: Blob[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = axis(sorted[i - 1]);
    const cur = axis(sorted[i]);
    if (cur - prev > gap) {
      clusters.push([sorted[i]]);
    } else {
      clusters[clusters.length - 1].push(sorted[i]);
    }
  }
  return clusters;
};

// Median of a numeric array. Empty → 0.
const median = (xs: readonly number[]): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

// Return the index in a sorted array that's closest in value to `v`.
const nearestIndex = (xs: readonly number[], v: number): number => {
  let best = 0;
  let bestDist = Math.abs(xs[0] - v);
  for (let i = 1; i < xs.length; i++) {
    const d = Math.abs(xs[i] - v);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
};
