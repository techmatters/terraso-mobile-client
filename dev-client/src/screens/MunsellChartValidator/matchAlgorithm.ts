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

// New chart-registration approach: rather than clustering detected
// features into rows/cols and enumerating template offsets, cast the
// problem as matching detected circles to a reference grid pattern
// via point-triplet correspondences. Three non-collinear point
// correspondences define an affine transform, so if we can pick 3
// detected circles and figure out which 3 reference-grid positions
// they map to, everything else follows.
//
// This file contains the primitives:
//   - Point type
//   - Reference grid (fixed 6×6 lattice with column-spacing 2 and
//     row-spacing 3 in template units)
//   - TripletFilter type — lets callers reject implausible triplets
//     (collinear, too-close, etc.) before doing expensive work
//   - TripletIterator type — abstracts "how do we enumerate 3-point
//     combinations" so smarter iterators (spatial hashing, RANSAC
//     sampling, geometric-hash prefiltering, etc.) can plug in later
//     with the same signature
//   - iterateAllTriplets — the naive C(N, 3) implementation. First
//     one to test correctness; will be swapped for cheaper iterators
//     once the surrounding pipeline is in place.

export type Point = {x: number; y: number};

// Fixed 6×6 template lattice. Column-step is 2 template units,
// row-step is 3 template units — the exact numbers don't matter as
// long as they're consistent across callers; downstream code
// computes an affine transform that maps this lattice into pixel
// coordinates. Ordering is row-major (row 0 col 0, row 0 col 1, …,
// row 5 col 5).
export const REFERENCE_GRID: readonly Point[] = (() => {
  const out: Point[] = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      out.push({x: col * 2, y: row * 3});
    }
  }
  return out;
})();

// Sampling grid template — where we actually pick pixel color from
// the chart. 7 rows × 6 cols = 42 positions in template units. Same
// column x-positions as REFERENCE_GRID; y is `row * 3 - 1.5` for
// row = 0..6, so the sample rows sit half a row-step offset from
// the reference hole rows (i.e., at the swatch positions on the
// chart, which print between the holes vertically). The 7 rows
// straddle the 6 hole rows: one above the top hole (y = -1.5),
// five between adjacent holes, and one below the bottom hole
// (y = 16.5).
export const SAMPLE_GRID: readonly Point[] = (() => {
  const out: Point[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 6; col++) {
      out.push({x: col * 2, y: row * 3 - 1.5});
    }
  }
  return out;
})();

// A filter runs on a candidate triplet and returns true to accept
// it, false to reject. Rejected triplets are skipped by the
// iterator without being yielded to the caller — cheaper than
// yielding and having the caller drop them. Typical use:
//   - reject collinear triplets (affine fit would be singular)
//   - reject triplets with span smaller than the expected feature
//     size (unstable fit)
//   - reject triplets whose implied scale falls outside the
//     expected pixel-per-template-unit range
export type TripletFilter = (triplet: readonly Point[]) => boolean;

// Iterator abstraction — every implementation takes a point list
// and an optional filter, yields triplets that pass the filter.
// Written as a Generator so callers can `for (const t of iter())`
// and break out early when they've found a good match. Callers
// that need a callback style can wrap the generator themselves.
export type TripletIterator = (
  points: readonly Point[],
  filter: TripletFilter | null,
) => Generator<readonly Point[]>;

// Naive iterator — every (i < j < k) combination, filtered on the
// fly. For N points this yields C(N, 3) triplets. Fine for a first
// pass; the point-count in practice is on the order of dozens for
// the detected list and ~36 for the reference grid, so C(36, 3) =
// 7140 and C(60, 3) = 34220 — the outer RANSAC loop will bound the
// cost from above by breaking as soon as it finds a good enough
// match.
export const iterateAllTriplets: TripletIterator = function* (points, filter) {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const triplet = [points[i], points[j], points[k]] as const;
        if (filter && !filter(triplet)) continue;
        yield triplet;
      }
    }
  }
};

// Random-sampling iterator factory. Returned iterator yields up to
// `count` DISTINCT unordered triplets (i, j, k with i < j < k) that
// pass the filter. Filter rejections don't count against `count` —
// only successfully-yielded triplets do — so a strict filter still
// gives you the full `count` samples (up to the total distinct
// filtered-in triplet count on the input).
//
// Safety: gives up after `count * maxAttemptsPerYield` total random
// picks even if it hasn't hit `count` yieldable triplets yet, to
// protect against filters that reject nearly everything.
//
// Use with a large N as the outer iterator in RANSAC-style matches
// to slash the O(C(N,3)) work down to a fixed sample count. Trade-
// off is that random sampling can miss the single "correct" ref
// triplet, but for our case (36 ref points, ~800 pass distinct-
// row/col filter, 1000 samples ≥ full coverage in practice).
export const createRandomTripletIterator = (
  count: number,
  maxAttemptsPerYield: number = 100,
): TripletIterator => {
  return function* (points, filter) {
    const n = points.length;
    if (n < 3) return;
    const maxAttempts = count * maxAttemptsPerYield;
    const seen = new Set<string>();
    let yielded = 0;
    let attempted = 0;
    while (yielded < count && attempted < maxAttempts) {
      attempted++;
      const a = Math.floor(Math.random() * n);
      const b = Math.floor(Math.random() * n);
      const c = Math.floor(Math.random() * n);
      if (a === b || a === c || b === c) continue;
      const [i, j, k] = [a, b, c].sort((x, y) => x - y);
      const key = `${i},${j},${k}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const triplet = [points[i], points[j], points[k]] as const;
      if (filter && !filter(triplet)) continue;
      yield triplet;
      yielded++;
    }
  };
};

// ---------------------------------------------------------------------------
// Affine transform + RANSAC-style match.

// 2D affine: (x, y) → (a*x + b*y + c, d*x + e*y + f). Six parameters,
// exactly determined by 3 non-collinear point correspondences.
export type Affine = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

// Solve for the affine that maps refTriplet → detectedTriplet
// exactly (both triplets must be 3 points). Returns null if the
// reference triplet is collinear — the linear system is singular
// and no unique affine fits.
export const fitAffineFromTriplets = (
  refTriplet: readonly Point[],
  detectedTriplet: readonly Point[],
): Affine | null => {
  if (refTriplet.length !== 3 || detectedTriplet.length !== 3) return null;
  const xC = solve3([
    [refTriplet[0].x, refTriplet[0].y, detectedTriplet[0].x],
    [refTriplet[1].x, refTriplet[1].y, detectedTriplet[1].x],
    [refTriplet[2].x, refTriplet[2].y, detectedTriplet[2].x],
  ]);
  const yC = solve3([
    [refTriplet[0].x, refTriplet[0].y, detectedTriplet[0].y],
    [refTriplet[1].x, refTriplet[1].y, detectedTriplet[1].y],
    [refTriplet[2].x, refTriplet[2].y, detectedTriplet[2].y],
  ]);
  if (!xC || !yC) return null;
  return {a: xC[0], b: xC[1], c: xC[2], d: yC[0], e: yC[1], f: yC[2]};
};

export const applyAffine = (t: Affine, p: Point): Point => ({
  x: t.a * p.x + t.b * p.y + t.c,
  y: t.d * p.x + t.e * p.y + t.f,
});

// Score a candidate transform. Each ref point finds its nearest
// unclaimed detected point (greedy unique assignment); if within
// pixelThreshold, contributes `1 + TIGHTNESS_BONUS × (1 - (dist/
// threshold)²)` — a fixed 1.0 for the match itself plus a small
// bonus for how close the residual is. Otherwise 0.
//
// The fixed-1.0 term makes COUNT strictly dominant: a transform
// matching 31 loose-but-in-threshold refs (score ≈ 31) will always
// beat one matching 28 dead-on refs (score ≈ 30.8). The bonus is
// only ever a tie-breaker between transforms with the same match
// count. Earlier versions used only the (1 - (dist/thresh)²) term,
// which let tight-but-fewer fits beat loose-but-more fits — that
// caused visible "shifted by one row" misalignments where a
// slightly-tighter fit ignored the bottom detected row.
//
// Greedy unique-assignment (claimed[] array) prevents degenerate
// transforms that collapse many refs onto the same detected point.
const TIGHTNESS_BONUS = 0.1;
export const scoreTransform = (
  t: Affine,
  refPoints: readonly Point[],
  detectedPoints: readonly Point[],
  pixelThreshold: number,
): number => {
  const t2 = pixelThreshold * pixelThreshold;
  const claimed = new Array(detectedPoints.length).fill(false);
  let score = 0;
  for (const r of refPoints) {
    const ex = t.a * r.x + t.b * r.y + t.c;
    const ey = t.d * r.x + t.e * r.y + t.f;
    let bestIdx = -1;
    let bestDist2 = t2;
    for (let i = 0; i < detectedPoints.length; i++) {
      if (claimed[i]) continue;
      const dx = detectedPoints[i].x - ex;
      const dy = detectedPoints[i].y - ey;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      claimed[bestIdx] = true;
      score += 1 + TIGHTNESS_BONUS * (1 - bestDist2 / t2);
    }
  }
  return score;
};

// Post-fit predicate on an Affine. Return true to accept, false to
// reject. Useful for rejecting geometrically-implausible transforms
// (rotated / mirrored / degenerate) before wasting a score pass on
// them.
export type AffineFilter = (t: Affine) => boolean;

// Require the affine to be approximately axis-aligned AND positively
// oriented: REF x-axis maps more to image x than image y AND in the
// same direction (a ≥ |b|, so a > 0), and REF y-axis maps more to
// image y than image x AND in the same direction (e ≥ |d|, so e > 0).
// Rejects both 90° rotations AND mirror-flips. Kept exported for
// callers that want an extra post-fit belt to go with the pair-filter
// suspenders; findBestTransform now defaults to no affineFilter
// because `sameOrder` catches these cases earlier and cheaper.
export const isAxisAligned: AffineFilter = t =>
  t.a >= Math.abs(t.b) && t.e >= Math.abs(t.d);

// Pre-fit predicate on a (refTriplet, detectedTriplet) pair. Called
// before the affine solve so a rejected pair skips the fit and score
// entirely — much cheaper than a post-fit AffineFilter.
export type PairFilter = (
  refTriplet: readonly Point[],
  detectedTriplet: readonly Point[],
) => boolean;

// Return the permutation `p` such that (values[p[0]], values[p[1]],
// values[p[2]]) is ascending. Assumes 3 distinct values (ties give
// arbitrary but consistent order via Array.sort). Trivially fast.
const permOf3 = (
  values: readonly [number, number, number],
): [number, number, number] => {
  const idxs: [number, number, number] = [0, 1, 2];
  idxs.sort((i, j) => values[i] - values[j]);
  return idxs;
};

// Enforce that ref and detected triplets have IDENTICAL x-order AND
// IDENTICAL y-order — i.e., "the leftmost ref point corresponds to
// the leftmost detected point, the topmost ref corresponds to the
// topmost detected, etc." This is a strict test that any valid
// affine mapping ref → detected must be axis-aligned, non-rotated
// (0°/90°/180°/270°), and non-mirrored. Doubles as an optimization:
// wrong-orientation pairs are skipped BEFORE the fit and score
// (~75% of pairs on a square-ish grid), and doubles as a rotation
// guard.
export const sameOrder: PairFilter = (rTri, dTri) => {
  const rXPerm = permOf3([rTri[0].x, rTri[1].x, rTri[2].x]);
  const dXPerm = permOf3([dTri[0].x, dTri[1].x, dTri[2].x]);
  if (
    rXPerm[0] !== dXPerm[0] ||
    rXPerm[1] !== dXPerm[1] ||
    rXPerm[2] !== dXPerm[2]
  )
    return false;
  const rYPerm = permOf3([rTri[0].y, rTri[1].y, rTri[2].y]);
  const dYPerm = permOf3([dTri[0].y, dTri[1].y, dTri[2].y]);
  return (
    rYPerm[0] === dYPerm[0] &&
    rYPerm[1] === dYPerm[1] &&
    rYPerm[2] === dYPerm[2]
  );
};

// Cross-product magnitude around the first point. Zero → collinear.
// Used as the default triplet filter so degenerate triplets don't
// waste a linear solve.
const NEAR_COLLINEAR_EPS = 1e-6;
export const isNonCollinear: TripletFilter = triplet => {
  if (triplet.length < 3) return false;
  const [a, b, c] = triplet;
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(cross) > NEAR_COLLINEAR_EPS;
};

// Reference-grid-specific filter: require all three points to have
// distinct x-coordinates AND distinct y-coordinates (equivalently:
// three different rows and three different columns on the ref
// lattice). Forces the triplet to span both axes with a minimum
// footprint, which stabilises the fitted affine — small-footprint
// triplets can produce transforms whose implied scale is wildly off
// on the axis they barely span, and then RANSAC can settle on the
// wrong (compressed) transform.
export const distinctRowsAndCols: TripletFilter = triplet => {
  if (triplet.length < 3) return false;
  const [a, b, c] = triplet;
  return (
    a.x !== b.x &&
    a.x !== c.x &&
    b.x !== c.x &&
    a.y !== b.y &&
    a.y !== c.y &&
    b.y !== c.y
  );
};

// Compose several filters — a triplet must pass ALL of them.
export const composeFilters =
  (...filters: TripletFilter[]): TripletFilter =>
  triplet =>
    filters.every(f => f(triplet));

// Iterate (refTriplet, detectedTriplet) pairs, fit the affine that
// maps ref → detected, score by inlier count on the FULL reference
// grid. Return the highest-scoring transform after exhaustively
// trying every (ref-triplet, detected-triplet) combination —
// there's no early exit. Filters cut the search space up front:
// `refFilter` prunes ref triplets (default: non-collinear AND
// distinct rows/cols to force a well-spread footprint), `detFilter`
// prunes detected triplets (default: non-collinear only).
export const findBestTransform = (
  refPoints: readonly Point[],
  detectedPoints: readonly Point[],
  pixelThreshold: number,
  refFilter: TripletFilter | null = composeFilters(
    isNonCollinear,
    distinctRowsAndCols,
  ),
  detFilter: TripletFilter | null = isNonCollinear,
  refIterator: TripletIterator = iterateAllTriplets,
  detIterator: TripletIterator = iterateAllTriplets,
  pairFilter: PairFilter | null = sameOrder,
  affineFilter: AffineFilter | null = null,
): {
  transform: Affine;
  score: number;
  refTriplet: readonly Point[];
  detectedTriplet: readonly Point[];
} | null => {
  let bestT: Affine | null = null;
  let bestScore = 0;
  let bestRefTri: readonly Point[] | null = null;
  let bestDetTri: readonly Point[] | null = null;
  for (const rTri of refIterator(refPoints, refFilter)) {
    for (const dTri of detIterator(detectedPoints, detFilter)) {
      // Cheap pair-filter check FIRST — culls ~75% of pairs (wrong
      // orientation, mirrored, etc.) before the expensive fit + score.
      if (pairFilter && !pairFilter(rTri, dTri)) continue;
      const t = fitAffineFromTriplets(rTri, dTri);
      if (!t) continue;
      if (affineFilter && !affineFilter(t)) continue;
      const s = scoreTransform(t, refPoints, detectedPoints, pixelThreshold);
      if (s > bestScore) {
        bestScore = s;
        bestT = t;
        bestRefTri = rTri;
        bestDetTri = dTri;
      }
    }
  }
  if (!bestT || !bestRefTri || !bestDetTri) return null;
  // Refine the winning 3-point fit as a least-squares fit over ALL
  // inliers. Bumps the score meaningfully on real charts by
  // averaging out the residuals a single triplet can't correct for.
  const refined = refineAffineWithInliers(
    bestT,
    refPoints,
    detectedPoints,
    pixelThreshold,
  );
  if (refined) {
    const refinedScore = scoreTransform(
      refined,
      refPoints,
      detectedPoints,
      pixelThreshold,
    );
    if (refinedScore >= bestScore) {
      bestT = refined;
      bestScore = refinedScore;
    }
  }
  return {
    transform: bestT,
    score: bestScore,
    refTriplet: bestRefTri,
    detectedTriplet: bestDetTri,
  };
};

// Direct 3×3 solve for `a*x1 + b*x2 + c = z` given three samples,
// via Gaussian elimination on the augmented matrix. Returns null if
// the coefficient matrix is singular (rows/cols of the reference
// triplet are linearly dependent — i.e. collinear points).
const solve3 = (
  samples: readonly [number, number, number][],
): [number, number, number] | null => {
  if (samples.length !== 3) return null;
  return gaussianEliminate3x3(samples.map(s => [s[0], s[1], 1, s[2]]));
};

// Least-squares solve for `a*x1 + b*x2 + c = z` given N ≥ 3 samples,
// via the normal equations. Used by refineAffineWithInliers to
// average out per-point residuals that a 3-point RANSAC fit leaves
// on the table.
const leastSquares3 = (
  samples: readonly [number, number, number][],
): [number, number, number] | null => {
  if (samples.length < 3) return null;
  let Sxx = 0;
  let Sxy = 0;
  let Sx = 0;
  let Syy = 0;
  let Sy = 0;
  let N = 0;
  let Sxz = 0;
  let Syz = 0;
  let Sz = 0;
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
  return gaussianEliminate3x3([
    [Sxx, Sxy, Sx, Sxz],
    [Sxy, Syy, Sy, Syz],
    [Sx, Sy, N, Sz],
  ]);
};

// Gaussian elimination on a 3×4 augmented matrix with partial
// pivoting. Both solve3 and leastSquares3 funnel through this so
// the numerics stay in one place. Returns null if singular.
const gaussianEliminate3x3 = (
  M: readonly (readonly number[])[],
): [number, number, number] | null => {
  const A = M.map(row => [...row]);
  for (let i = 0; i < 3; i++) {
    let pivot = i;
    let pivotAbs = Math.abs(A[i][i]);
    for (let k = i + 1; k < 3; k++) {
      const v = Math.abs(A[k][i]);
      if (v > pivotAbs) {
        pivotAbs = v;
        pivot = k;
      }
    }
    if (pivotAbs < 1e-9) return null;
    if (pivot !== i) {
      const tmp = A[i];
      A[i] = A[pivot];
      A[pivot] = tmp;
    }
    for (let k = 0; k < 3; k++) {
      if (k === i) continue;
      const factor = A[k][i] / A[i][i];
      if (factor === 0) continue;
      for (let j = i; j <= 3; j++) A[k][j] -= factor * A[i][j];
    }
  }
  return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]];
};

// Refit an affine by least-squares over all inliers under an initial
// transform. Each ref point claims its greedy-nearest unclaimed
// detected within `pixelThreshold`; those pairs feed a 3-parameter
// LSQ each for the X and Y coefficients. Returns null if fewer than
// 3 inliers were found or the LSQ system is singular.
export const refineAffineWithInliers = (
  t: Affine,
  refPoints: readonly Point[],
  detectedPoints: readonly Point[],
  pixelThreshold: number,
): Affine | null => {
  const t2 = pixelThreshold * pixelThreshold;
  const claimed = new Array(detectedPoints.length).fill(false);
  const xSamples: [number, number, number][] = [];
  const ySamples: [number, number, number][] = [];
  for (const r of refPoints) {
    const ex = t.a * r.x + t.b * r.y + t.c;
    const ey = t.d * r.x + t.e * r.y + t.f;
    let bestIdx = -1;
    let bestDist2 = t2;
    for (let i = 0; i < detectedPoints.length; i++) {
      if (claimed[i]) continue;
      const dx = detectedPoints[i].x - ex;
      const dy = detectedPoints[i].y - ey;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      claimed[bestIdx] = true;
      const d = detectedPoints[bestIdx];
      xSamples.push([r.x, r.y, d.x]);
      ySamples.push([r.x, r.y, d.y]);
    }
  }
  if (xSamples.length < 3) return null;
  const xC = leastSquares3(xSamples);
  const yC = leastSquares3(ySamples);
  if (!xC || !yC) return null;
  return {a: xC[0], b: xC[1], c: xC[2], d: yC[0], e: yC[1], f: yC[2]};
};
