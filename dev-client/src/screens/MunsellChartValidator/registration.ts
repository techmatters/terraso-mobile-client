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
  connectedComponents,
  threshold,
  type Blob,
  type GrayImage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';

// Registration: find the 4 corners of the Munsell chart in a
// downsampled grayscale image, then produce a homography that maps
// chart-normalized coords (u, v) ∈ [0, 1] to image pixel coords.
// The chart-analysis pipeline then uses the homography to place a
// sampling window on each swatch.
//
// Approach: chart is much brighter than any realistic scene behind it
// (soil, hand, table). Threshold at moderate brightness → find largest
// connected component → use its axis-aligned bounding box as the chart
// bounds. This assumes the phone is roughly aligned with the chart
// (< ~15° rotation). If real captures show consistent rotation, upgrade
// to a rotated bounding box via PCA on the blob's pixel positions.

export type Point = {x: number; y: number};
export type ChartCorners = {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
};

// The 3x3 homography H. Stored row-major:
//   H = [ H[0] H[1] H[2] ]
//       [ H[3] H[4] H[5] ]
//       [ H[6] H[7] H[8] ]
// Apply as: (x', y', w') = H * (u, v, 1); then divide out w'.
export type Homography = readonly number[];

// Detect the chart's 4 corners in the given grayscale image. Returns
// null if no plausible chart is found (biggest blob too small, wrong
// aspect ratio, etc.). The caller falls back to manual corner-tap.
export const detectChartCorners = (
  img: GrayImage,
  opts: {brightnessThreshold?: number; minAreaFraction?: number} = {},
): ChartCorners | null => {
  const brightnessThreshold = opts.brightnessThreshold ?? 150;
  const minAreaFraction = opts.minAreaFraction ?? 0.15;

  const mask = threshold(img, brightnessThreshold);
  const blobs = connectedComponents(mask);
  if (blobs.length === 0) return null;

  // Pick the largest blob — should be the chart body.
  blobs.sort((a, b) => b.area - a.area);
  const chart = blobs[0];

  // Sanity check: chart should occupy a decent chunk of the frame.
  // If the largest blob is tiny, we're probably looking at a chart-less
  // scene (or the threshold is wrong for this lighting).
  const totalPixels = img.width * img.height;
  if (chart.area < totalPixels * minAreaFraction) return null;

  return cornersFromBlob(chart);
};

// Extract axis-aligned corners from a blob's bounding box. Order: top-
// left, top-right, bottom-right, bottom-left, in the image's pixel
// coordinate frame (y increases downward). Assumes the chart is
// approximately axis-aligned with the image — see file header.
const cornersFromBlob = (b: Blob): ChartCorners => ({
  tl: {x: b.minX, y: b.minY},
  tr: {x: b.maxX, y: b.minY},
  br: {x: b.maxX, y: b.maxY},
  bl: {x: b.minX, y: b.maxY},
});

// Compute a 3x3 homography H such that H * (u, v, 1) → (x, y, w)
// with x/w, y/w being the image pixel coords, where (u, v) are the
// chart-normalized coords with (0, 0) at top-left corner and (1, 1)
// at bottom-right corner.
//
// Standard 4-point projective transform: for each of the 4 corner
// correspondences we write 2 linear equations in the 8 unknowns
// (h11..h32; h33 is fixed at 1). Solve the resulting 8x8 system by
// Gaussian elimination.
export const computeHomography = (corners: ChartCorners): Homography => {
  // Chart-normalised source points, in the same order as ChartCorners.
  const src: Point[] = [
    {x: 0, y: 0},
    {x: 1, y: 0},
    {x: 1, y: 1},
    {x: 0, y: 1},
  ];
  const dst: Point[] = [corners.tl, corners.tr, corners.br, corners.bl];

  // Build the 8x9 augmented matrix A|b. Each corner correspondence
  // (u, v) → (x, y) contributes two rows:
  //   [ u  v  1  0  0  0  -u*x  -v*x ] · h = x
  //   [ 0  0  0  u  v  1  -u*y  -v*y ] · h = y
  // where h = [h11 h12 h13 h21 h22 h23 h31 h32]^T.
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const {x: u, y: v} = src[i];
    const {x, y} = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }
  const h = gaussianEliminate(A);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
};

// Apply a homography to a chart-normalized (u, v) point → image
// pixel coords.
export const applyHomography = (H: Homography, u: number, v: number): Point => {
  const x = H[0] * u + H[1] * v + H[2];
  const y = H[3] * u + H[4] * v + H[5];
  const w = H[6] * u + H[7] * v + H[8];
  return {x: x / w, y: y / w};
};

// In-place Gaussian elimination with partial pivoting. Input is an
// N x (N+1) matrix (each row: N coefficients + 1 RHS value). Returns
// the solution vector of length N. Throws on singular matrix — the
// homography case is well-conditioned unless corners are collinear,
// which shouldn't happen with a real chart.
const gaussianEliminate = (A: number[][]): number[] => {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    // Partial pivot: find row with max |A[k][i]| for k >= i.
    let pivotRow = i;
    let pivotVal = Math.abs(A[i][i]);
    for (let k = i + 1; k < n; k++) {
      const v = Math.abs(A[k][i]);
      if (v > pivotVal) {
        pivotVal = v;
        pivotRow = k;
      }
    }
    if (pivotVal < 1e-12) {
      throw new Error('Singular matrix in homography solve');
    }
    if (pivotRow !== i) {
      const tmp = A[i];
      A[i] = A[pivotRow];
      A[pivotRow] = tmp;
    }
    // Eliminate column i in all other rows.
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i] / A[i][i];
      if (factor === 0) continue;
      for (let j = i; j <= n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }
  // Read back the solution.
  const x = new Array<number>(n);
  for (let i = 0; i < n; i++) x[i] = A[i][n] / A[i][i];
  return x;
};
