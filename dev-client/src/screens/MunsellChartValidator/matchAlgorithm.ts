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
  computeUniversalMaxReferenceGrid,
  computeUniversalMaxSampleGrid,
  MUNSELL_PAGES,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

// New chart-registration approach: rather than clustering detected
// features into rows/cols and enumerating template offsets, cast the
// problem as matching detected circles to a reference grid pattern
// via point-triplet correspondences. Three non-collinear point
// correspondences define an affine transform, so if we can pick 3
// detected circles and figure out which 3REFER reference-grid positions
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

// Reference lattice for RANSAC matching — the SET of chart-hole
// positions the algorithm expects to align its transform to.
// Computed as the per-row MAX (union) of hole counts across ALL
// pages in MUNSELL_PAGES so any real chart's holes can contribute
// to scoring: a fit that lands a ref point at a position where the
// physical page has no chip simply doesn't find a nearby detection,
// which costs nothing. Using MIN (intersection) discarded ~6 ref
// positions 10YR has beyond what every other page has and cut its
// max score from 30 to 24.
export const REFERENCE_GRID: readonly Point[] =
  computeUniversalMaxReferenceGrid(MUNSELL_PAGES);

// Sampling grid template — where we actually pick pixel color from
// the chart. Computed as the per-row MAXIMUM of chip counts across
// ALL pages, so a single decode pass captures every chip position
// that could exist on any page. Each per-page result then reads
// only the subset of positions that has real chips on that page.
// Column-step is 2, row-step is 3, with a -1.5 offset in y so chip
// rows sit half a row-step above the corresponding hole row
// (physically, the chip is above its comparison hole).
//
// One extra point is appended at (10, 16.5) — bottom-right corner of
// a full 7×6 grid, one slot beyond any page's actual chip layout.
// That slot is always empty on the physical chart; the result-grid UI
// uses it as a "test swatch" cell that compares a user-picked
// reference colour (Post-it yellow, gray card, etc.) against whatever
// the DNG shows at that position. Read via TEST_SWATCH_INDEX below.
export const TEST_SWATCH_POINT: Point = {x: 5 * 2, y: 6 * 3 - 1.5};
export const SAMPLE_GRID: readonly Point[] = [
  ...computeUniversalMaxSampleGrid(MUNSELL_PAGES),
  TEST_SWATCH_POINT,
];
export const TEST_SWATCH_INDEX: number = SAMPLE_GRID.length - 1;

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

// Cheap upper bound on scoreTransform. For each ref point, count 1 if
// ANY detected point sits within pixelThreshold (no uniqueness
// tracking, no tightness bonus, first-hit break). Since scoreTransform
// applies greedy unique assignment (each detected can claim at most
// one ref), its match count is ≤ this count. Since tightness bonus is
// ≤ 0.1 per match, scoreTransform(t) ≤ cheapScoreUpperBound(t) × 1.1.
//
// That inequality makes this a PROVABLY CORRECT prune: if the cheap
// score × 1.1 is already less than the current best, the full score
// cannot exceed the best either, so we skip. Killed 90%+ of full
// scoreTransform calls in profile — full-score cost went from
// dominating the RANSAC wall-clock to a small tail behind the cheap
// pre-score.
//
// `minRequired` lets the function early-exit as soon as
// count + refsRemaining < minRequired — the count can't possibly
// reach the threshold, so the caller will prune. Caller passes
// `Math.ceil(bestScore / 1.1)` for that threshold. Returned value in
// the early-exit case is an upper bound on the TRUE count (specifically
// `count + refsRemaining`), which is still < minRequired, so the
// caller's `cheap * 1.1 < bestScore` test correctly prunes. Pass 0
// (default) to disable early-exit and get the full count.
export const cheapScoreUpperBound = (
  t: Affine,
  refPoints: readonly Point[],
  detectedPoints: readonly Point[],
  pixelThreshold: number,
  minRequired: number = 0,
): number => {
  const t2 = pixelThreshold * pixelThreshold;
  let count = 0;
  const nDet = detectedPoints.length;
  const nRef = refPoints.length;
  for (let ri = 0; ri < nRef; ri++) {
    const r = refPoints[ri];
    const ex = t.a * r.x + t.b * r.y + t.c;
    const ey = t.d * r.x + t.e * r.y + t.f;
    for (let i = 0; i < nDet; i++) {
      const dx = detectedPoints[i].x - ex;
      const dy = detectedPoints[i].y - ey;
      if (dx * dx + dy * dy < t2) {
        count++;
        break;
      }
    }
    // Early-exit: if even matching every remaining ref wouldn't reach
    // minRequired, the caller will prune regardless. Bail with an
    // upper-bound value (count + remaining) that's still < minRequired.
    // Skips the tail of nDet-scans for hopeless candidates — dominant
    // speedup on transforms that barely miss the winning score.
    if (minRequired > 0) {
      const remaining = nRef - 1 - ri;
      if (count + remaining < minRequired) return count + remaining;
    }
  }
  return count;
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

// Reject transforms whose (image of REF x-axis) and (image of REF
// y-axis) are more than `maxSkewDeg` away from perpendicular. Real
// photos of a flat chart at reasonable tilt look nearly perpendicular
// (< 5° off in practice); a 30°+ skew is almost always a bad fit from
// a degenerate triplet, not a real perspective. Cheap: one dot
// product and two hypots per transform.
export const notTooSkewed = (maxSkewDeg: number): AffineFilter => {
  // Skew angle = 90° − angle_between(colX, colY). Allow up to
  // maxSkewDeg means |cos(angle_between)| ≤ sin(maxSkewDeg).
  const cosThreshold = Math.sin((maxSkewDeg * Math.PI) / 180);
  return (t: Affine) => {
    const lenX = Math.hypot(t.a, t.d);
    const lenY = Math.hypot(t.b, t.e);
    if (lenX < 1e-6 || lenY < 1e-6) return false;
    const dot = t.a * t.b + t.d * t.e;
    return Math.abs(dot / (lenX * lenY)) < cosThreshold;
  };
};

// Reject transforms whose x-scale and y-scale differ by more than
// `maxRatio`× either way. REFERENCE_GRID's col-spacing (2 units) and
// row-spacing (3 units) already encode the chart's real aspect ratio,
// so a valid transform should map both ref axes at the SAME pixels-per-
// unit — i.e., `|colX| ≈ |colY|`. Wrong-pairing fits (correct triplet
// members paired to WRONG ref indices, e.g. mapping ref-bottom-left
// onto chart-bottom-right) almost always come out with mismatched
// scales because they're stretching one axis to reach a point that
// really belongs on the other axis. Cheap: two hypots per transform.
export const similarScales = (maxRatio: number): AffineFilter => {
  return (t: Affine) => {
    const lenX = Math.hypot(t.a, t.d);
    const lenY = Math.hypot(t.b, t.e);
    if (lenX < 1e-6 || lenY < 1e-6) return false;
    const ratio = lenX / lenY;
    return ratio >= 1 / maxRatio && ratio <= maxRatio;
  };
};

// Reject transforms whose per-unit scale (pixels per REFERENCE_GRID
// template unit) falls outside `[minPxPerUnit, maxPxPerUnit]`. Since
// the chart-guide framing constrains how big the chart is in the
// capture, we know the expected pixels-per-unit range up front —
// rejecting fits well outside that range kills compressed and
// stretched fits that would otherwise score decently by matching
// paper-margin false-positives (the every-pixel candidate detector
// leaves a lot of those). `notTooSkewed` + `similarScales` don't
// catch uniform compression because both stay ratio-matched under
// scale. Cheap: two hypots per transform.
export const scaleInRange = (
  minPxPerUnit: number,
  maxPxPerUnit: number,
): AffineFilter => {
  return (t: Affine) => {
    const lenX = Math.hypot(t.a, t.d);
    const lenY = Math.hypot(t.b, t.e);
    return (
      lenX >= minPxPerUnit &&
      lenX <= maxPxPerUnit &&
      lenY >= minPxPerUnit &&
      lenY <= maxPxPerUnit
    );
  };
};

// Compose several AffineFilters — transform must pass ALL of them.
// Mirrors composeFilters for TripletFilter.
export const composeAffineFilters =
  (...filters: AffineFilter[]): AffineFilter =>
  t =>
    filters.every(f => f(t));

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

// Faster alternative to findBestTransform. Instead of enumerating
// all C(N,3) detected triplets per ref triplet, iterate detected
// PAIRS, compute the similarity that maps two ref points to the two
// detected, PREDICT where the third ref point should land, and only
// fit + score if a real detected point sits near that prediction.
//
// The similarity (uniform-scale rotation + translation, 4 DOF) is an
// approximation to the true affine (6 DOF): it can't represent shear.
// But for a flat chart photographed roughly overhead the true affine
// IS a similarity to within a few percent, so predicted-third almost
// always lands within a fraction of a hole radius of the real third
// detection. That prediction step turns the O(N³) inner enumeration
// into O(N²) + O(N) nearest-detected lookup — ~25× speedup in
// practice. The winning pair still gets a full 3-point affine fit +
// LSQ refinement over inliers, so the final transform quality is
// identical to findBestTransform's.
//
// Correctness note: fixing (r0, r1) → (d0, d1) means the orientation
// of the pair is baked in. We still do a sameOrder2 pre-check to kill
// mirror-flipped and 180°-rotated pairs before the similarity solve.
// Per-stage counters + block timers filled in by findBestTransformViaPairs
// so callers (or the chart-registration log line) can see where the
// wall-clock went — nearest-scan vs. score/fit vs. everything else.
// Cheap: increments are integer ops in the tight loop, one Date.now
// bracket around the (rare) score-fit block. Zero perf impact worth
// measuring vs. the seconds-long RANSAC total.
export type PairsProfile = {
  refTripletsTried: number;
  pairsTried: number; // (i,j) with i!=j actually entered
  pairsPassedSameOrder2: number;
  fitsAttempted: number; // reached fitAffineFromTriplets
  fitsOk: number; // non-null affine
  fitsPassedAffineFilter: number; // reached the cheap-score prune
  cheapScorePassed: number; // reached the full scoreTransform
  cheapScoreMs: number;
  scoreFitMs: number; // wall-clock inside just the full scoreTransform call
  bestScoreUpdates: number;
};

export const findBestTransformViaPairs = (
  refPoints: readonly Point[],
  detectedPoints: readonly Point[],
  pixelThreshold: number,
  refFilter: TripletFilter | null = composeFilters(
    isNonCollinear,
    distinctRowsAndCols,
  ),
  refIterator: TripletIterator = iterateAllTriplets,
  affineFilter: AffineFilter | null = null,
  // Tolerance for "the predicted third point is near a detected
  // point." The similarity is approximate (no shear); allow 2× the
  // pixelThreshold so perspective drift doesn't cause us to miss the
  // correct third. Bumping this loosens the pre-filter but doesn't
  // affect scoring — bad candidates still lose at the score step.
  predictionToleranceMultiplier: number = 2,
  profile?: PairsProfile,
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
  const predT = pixelThreshold * predictionToleranceMultiplier;
  const predT2 = predT * predT;
  const nDet = detectedPoints.length;
  // Local aliases for the profile counters — property access on an
  // optional object in the hot loop would slow things down. Copy back
  // at the end.
  let refTripletsTried = 0;
  let pairsTried = 0;
  let pairsPassedSameOrder2 = 0;
  let fitsAttempted = 0;
  let fitsOk = 0;
  let fitsPassedAffineFilter = 0;
  let cheapScorePassed = 0;
  let cheapScoreMs = 0;
  let scoreFitMs = 0;
  let bestScoreUpdates = 0;
  for (const rTri of refIterator(refPoints, refFilter)) {
    refTripletsTried++;
    const [r0, r1, r2] = rTri;
    const drX = r1.x - r0.x;
    const drY = r1.y - r0.y;
    const drNormSq = drX * drX + drY * drY;
    if (drNormSq < 1e-12) continue;
    // Enumerate detected pairs (i, j) with i != j. Unordered pairs
    // aren't enough — the direction (r0→r1) fixes which detected
    // point is "d0" and which is "d1", so we need both (i, j) and
    // (j, i). Not a real cost multiplier since sameOrder2 kills the
    // mirror half almost immediately.
    for (let i = 0; i < nDet; i++) {
      const d0 = detectedPoints[i];
      for (let j = 0; j < nDet; j++) {
        if (j === i) continue;
        pairsTried++;
        const d1 = detectedPoints[j];
        // sameOrder2: 2-point analogue of sameOrder — kills flipped
        // and mirrored pairs before the similarity solve.
        if (r0.x < r1.x !== d0.x < d1.x) continue;
        if (r0.y < r1.y !== d0.y < d1.y) continue;
        pairsPassedSameOrder2++;
        // Similarity mapping (r0,r1) → (d0,d1). Let vr = r1-r0,
        // vd = d1-d0. Complex-number style:
        //   scaleCos = (vr · vd) / |vr|²
        //   scaleSin = (vr × vd) / |vr|²
        //   x' = scaleCos*x − scaleSin*y + tx
        //   y' = scaleSin*x + scaleCos*y + ty
        const ddX = d1.x - d0.x;
        const ddY = d1.y - d0.y;
        const scaleCos = (drX * ddX + drY * ddY) / drNormSq;
        const scaleSin = (drX * ddY - drY * ddX) / drNormSq;
        const tx = d0.x - (scaleCos * r0.x - scaleSin * r0.y);
        const ty = d0.y - (scaleSin * r0.x + scaleCos * r0.y);
        // Predict where r2 should land.
        const d2predX = scaleCos * r2.x - scaleSin * r2.y + tx;
        const d2predY = scaleSin * r2.x + scaleCos * r2.y + ty;
        // Find nearest detected to the prediction. Linear scan; N is
        // small enough (~100) that a kd-tree isn't worth the setup.
        let bestIdx = -1;
        let bestDist2 = predT2;
        for (let k = 0; k < nDet; k++) {
          if (k === i || k === j) continue;
          const dp = detectedPoints[k];
          const dxk = dp.x - d2predX;
          const dyk = dp.y - d2predY;
          const dk2 = dxk * dxk + dyk * dyk;
          if (dk2 < bestDist2) {
            bestDist2 = dk2;
            bestIdx = k;
          }
        }
        if (bestIdx < 0) continue;
        const d2 = detectedPoints[bestIdx];
        // Fit the FULL affine on the 3-point correspondence — the
        // similarity is a predictor only, we want proper 6-DOF fit
        // for scoring and downstream sampling.
        fitsAttempted++;
        const t = fitAffineFromTriplets([r0, r1, r2], [d0, d1, d2]);
        if (!t) continue;
        fitsOk++;
        if (affineFilter && !affineFilter(t)) continue;
        fitsPassedAffineFilter++;
        // Cheap upper-bound prune. cheapScoreUpperBound(t) × 1.1 is a
        // provable upper bound on scoreTransform(t) (see the helper
        // comment). If that already can't beat the current best, skip
        // the full score — dominant win when scoreTransform is the
        // hot spot. Profile earlier showed 194K full scores taking
        // 40s; this drops it to ~10K full scores + 194K cheap scores.
        // minRequired lets cheapScoreUpperBound itself early-exit as
        // soon as it can't reach the threshold — dominant secondary
        // speedup on the cheap-score cost itself.
        const minRequired = Math.ceil(bestScore / (1 + TIGHTNESS_BONUS));
        const tCheap0 = Date.now();
        const cheap = cheapScoreUpperBound(
          t,
          refPoints,
          detectedPoints,
          pixelThreshold,
          minRequired,
        );
        cheapScoreMs += Date.now() - tCheap0;
        if (cheap * (1 + TIGHTNESS_BONUS) < bestScore) continue;
        cheapScorePassed++;
        const tFit0 = Date.now();
        const s = scoreTransform(t, refPoints, detectedPoints, pixelThreshold);
        scoreFitMs += Date.now() - tFit0;
        if (s > bestScore) {
          bestScore = s;
          bestT = t;
          bestRefTri = [r0, r1, r2];
          bestDetTri = [d0, d1, d2];
          bestScoreUpdates++;
        }
      }
    }
  }
  if (profile) {
    profile.refTripletsTried = refTripletsTried;
    profile.pairsTried = pairsTried;
    profile.pairsPassedSameOrder2 = pairsPassedSameOrder2;
    profile.fitsAttempted = fitsAttempted;
    profile.fitsOk = fitsOk;
    profile.fitsPassedAffineFilter = fitsPassedAffineFilter;
    profile.cheapScorePassed = cheapScorePassed;
    profile.cheapScoreMs = cheapScoreMs;
    profile.scoreFitMs = scoreFitMs;
    profile.bestScoreUpdates = bestScoreUpdates;
  }
  if (!bestT || !bestRefTri || !bestDetTri) return null;
  // Same LSQ refit as findBestTransform — spread residual error
  // across all inliers instead of leaning on the winning triplet.
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

// ---------------------------------------------------------------------------
// Registration-algorithm registry. Pluggable so the RawColorTools screen
// can offer a dropdown of registration strategies to A/B against each
// other on the same set of detected holes. Every algorithm consumes the
// SAME hole-detection output (mask → inscribed circles) and returns the
// SAME shape — a best-fit affine + score + which ref/detected triplet
// won — so downstream sampling and debug rendering are unchanged.

export type RegistrationAlgorithm = 'constrained-random' | 'directed-quadrant';

// Entry for the RawColorTools dropdown. `id` is what gets persisted to
// kvStorage + threaded through the nav params + resolved to a runner
// inside gridRegistration. `label` is what the user sees.
export const REGISTRATION_ALGORITHMS: readonly {
  id: RegistrationAlgorithm;
  label: string;
}[] = [
  {id: 'constrained-random', label: 'Constrained random'},
  {id: 'directed-quadrant', label: 'Directed quadrant'},
];

export const DEFAULT_REGISTRATION_ALGORITHM: RegistrationAlgorithm =
  'constrained-random';

// Look up a persisted string against the known algorithm ids; fall back
// to the default if unrecognised (protects against renamed / removed
// ids leaving stale kvStorage entries in a bad state).
export const resolveRegistrationAlgorithm = (
  value: string | undefined | null,
): RegistrationAlgorithm => {
  if (value && REGISTRATION_ALGORITHMS.some(a => a.id === value)) {
    return value as RegistrationAlgorithm;
  }
  return DEFAULT_REGISTRATION_ALGORITHM;
};

// Directed-quadrant algorithm. Pick ref triplets from three
// well-separated corners of the ref grid (top-left, top-right,
// bottom-left; 9 candidates per corner → 9^3 = 729 outer iterations).
// For each outer triplet, use the chart-guide rectangle to compute each
// ref point's EXPECTED image position + a per-axis slop window, gather
// only detected holes inside that window, enumerate the small
// cross-product of candidates, fit + score. Much faster than
// findBestTransformViaPairs when the user framed the chart within the
// guide — the slop window replaces the O(N) nearest-scan with an O(k)
// candidate scan where k is typically 1-3.
//
// Signature matches findBestTransformViaPairs's — same return shape —
// so the algorithm dispatcher can swap them behind a switch. Extra
// input: `guideRect` (image-pixel coords of the capture-time chart
// guide) is required — the algorithm has nothing to pivot around
// without it.
export type DirectedQuadrantProfile = {
  tlCandidatePool: number; // detected holes near top-left corner refs
  trCandidatePool: number;
  blCandidatePool: number;
  tripletsTried: number; // (i,j,k) outer combos actually entered
  combosTried: number; // (d0,d1,d2) candidate combos actually entered
  fitsOk: number;
  fitsPassedAffineFilter: number;
  cheapScorePassed: number;
  cheapScoreMs: number;
  scoreFitMs: number;
  bestScoreUpdates: number;
  slopX: number; // slop radius actually used, in pixels
  slopY: number;
};

const CORNER_SIZE = 9; // per-corner ref count (roughly 3x3 near the corner)

export const findBestTransformDirectedQuadrant = (
  refPoints: readonly Point[],
  detectedPoints: readonly Point[],
  pixelThreshold: number,
  affineFilter: AffineFilter | null = null,
  // Chart-guide rectangle in image-pixel coords — from
  // computeChartGuideRect(imgW, imgH). The nominal ref-space →
  // image-space affine is derived by mapping the ref-grid bounding box
  // onto this rectangle directly (no inset). The affine only needs to
  // land expected positions "close enough" for slop to catch a real
  // detection; the final fit step corrects any scale mismatch (chart
  // typically has a border, so real hole positions sit slightly inside
  // the guide — the slop absorbs that).
  guideRect: {x: number; y: number; w: number; h: number} | null = null,
  // Fraction of guide.w and guide.h used as per-axis slop half-width
  // for candidate selection. 0.15 = ±15% of guide dimension. Widen if
  // charts are consistently missed (framing loose, or chart border
  // large); tighten if too many wrong candidates get picked and score
  // slower.
  slopFrac: number = 0.15,
  profile?: DirectedQuadrantProfile,
  // Full-chart bounding box in ref-grid coordinate space. Nominal
  // ref→image affine maps THESE bounds onto the guide rect (not the
  // per-page refPoints bounding box). Necessary for pages whose ref
  // grid populates only a subset of the physical grid — e.g.
  // 10Y-5GY's 3 hole rows × 4 cols → refBounds (2..8, 6..12), which
  // if used as-is would map that small strip across the entire guide,
  // placing every nominal expected position far from where the actual
  // holes are and giving fitOk=0. Pass canonical (0..10, 0..15) for
  // standard Munsell soil-color-book pages so the ref-y/refBounds
  // maps naturally onto the guide rect. Null → fall back to using
  // refPoints' own bounding box (original behavior).
  fullChartBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null = null,
): {
  transform: Affine;
  score: number;
  refTriplet: readonly Point[];
  detectedTriplet: readonly Point[];
} | null => {
  if (!guideRect) {
    throw new Error(
      'findBestTransformDirectedQuadrant: guideRect is required — this ' +
        'algorithm derives its nominal ref→image affine from the ' +
        'capture-time chart-guide rectangle.',
    );
  }
  if (refPoints.length < 3 || detectedPoints.length < 3) return null;

  // 1. Bounding box for the nominal affine. Prefer the caller-supplied
  //    full-chart bounds (so pages populating only a subset of the
  //    physical grid still map their ref points to the correct region
  //    of the guide rect); fall back to the ref grid's own bbox.
  let refMinX: number;
  let refMaxX: number;
  let refMinY: number;
  let refMaxY: number;
  if (fullChartBounds) {
    refMinX = fullChartBounds.minX;
    refMaxX = fullChartBounds.maxX;
    refMinY = fullChartBounds.minY;
    refMaxY = fullChartBounds.maxY;
  } else {
    refMinX = Infinity;
    refMaxX = -Infinity;
    refMinY = Infinity;
    refMaxY = -Infinity;
    for (const p of refPoints) {
      if (p.x < refMinX) refMinX = p.x;
      if (p.x > refMaxX) refMaxX = p.x;
      if (p.y < refMinY) refMinY = p.y;
      if (p.y > refMaxY) refMaxY = p.y;
    }
  }
  const refW = refMaxX - refMinX;
  const refH = refMaxY - refMinY;
  if (refW < 1e-6 || refH < 1e-6) return null;

  // 2. Nominal ref → image affine. Maps refBounds directly onto
  //    guideRect (anisotropic in general — ref-grid aspect and guide
  //    aspect don't have to match; per-axis slop below handles that).
  const sx = guideRect.w / refW;
  const sy = guideRect.h / refH;
  const nominalA = sx;
  const nominalE = sy;
  const nominalC = guideRect.x - refMinX * sx;
  const nominalF = guideRect.y - refMinY * sy;
  const nominalExpectedX = (p: Point) => nominalA * p.x + nominalC;
  const nominalExpectedY = (p: Point) => nominalE * p.y + nominalF;

  // 3. Corner subsets — the CORNER_SIZE nearest ref points to each
  //    corner (roughly a 3x3 block on a rectangular grid). Deliberately
  //    NOT top-right along with bottom-left plus bottom-right, since two
  //    corners on the same edge give a narrow triangle → unstable fit;
  //    top-left / top-right / bottom-left is a wide L shape.
  const pickNearestCorner = (cornerX: number, cornerY: number): Point[] => {
    const scored = refPoints
      .map(p => ({
        p,
        d2:
          (p.x - cornerX) * (p.x - cornerX) + (p.y - cornerY) * (p.y - cornerY),
      }))
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, CORNER_SIZE);
    return scored.map(x => x.p);
  };
  const tlRefs = pickNearestCorner(refMinX, refMinY);
  const trRefs = pickNearestCorner(refMaxX, refMinY);
  const blRefs = pickNearestCorner(refMinX, refMaxY);

  // 4. Per-axis slop window. Rectangle, not circle — a portrait guide
  //    would give a tiny circle if we used min(w,h) × frac.
  const slopX = guideRect.w * slopFrac;
  const slopY = guideRect.h * slopFrac;

  // 5. Precompute candidate detected indices for each ref point in
  //    each corner. For most well-framed captures each ref maps to 1-3
  //    candidates.
  const candidatesFor = (r: Point): number[] => {
    const expX = nominalExpectedX(r);
    const expY = nominalExpectedY(r);
    const out: number[] = [];
    for (let i = 0; i < detectedPoints.length; i++) {
      const dp = detectedPoints[i];
      if (Math.abs(dp.x - expX) < slopX && Math.abs(dp.y - expY) < slopY) {
        out.push(i);
      }
    }
    return out;
  };
  const tlCandidates = tlRefs.map(candidatesFor);
  const trCandidates = trRefs.map(candidatesFor);
  const blCandidates = blRefs.map(candidatesFor);

  // Sum candidate pool sizes for the profile — a low pool count is the
  // usual failure mode (framing was off / slop too tight).
  const poolSize = (lists: number[][]) =>
    lists.reduce((n, l) => n + l.length, 0);
  const tlPool = poolSize(tlCandidates);
  const trPool = poolSize(trCandidates);
  const blPool = poolSize(blCandidates);

  // 6. Outer loop over 9^3 = 729 ref-triplets, inner loop over the
  //    small cross-product of candidate detected points per ref.
  let bestT: Affine | null = null;
  let bestScore = 0;
  let bestRefTri: readonly Point[] | null = null;
  let bestDetTri: readonly Point[] | null = null;
  let tripletsTried = 0;
  let combosTried = 0;
  let fitsOk = 0;
  let fitsPassedAffineFilter = 0;
  let cheapScorePassed = 0;
  let cheapScoreMs = 0;
  let scoreFitMs = 0;
  let bestScoreUpdates = 0;

  for (let i = 0; i < tlRefs.length; i++) {
    const r0 = tlRefs[i];
    const c0List = tlCandidates[i];
    if (c0List.length === 0) continue;
    for (let j = 0; j < trRefs.length; j++) {
      const r1 = trRefs[j];
      const c1List = trCandidates[j];
      if (c1List.length === 0) continue;
      for (let k = 0; k < blRefs.length; k++) {
        const r2 = blRefs[k];
        const c2List = blCandidates[k];
        if (c2List.length === 0) continue;
        tripletsTried++;

        for (const d0i of c0List) {
          const d0 = detectedPoints[d0i];
          for (const d1i of c1List) {
            if (d1i === d0i) continue;
            const d1 = detectedPoints[d1i];
            for (const d2i of c2List) {
              if (d2i === d0i || d2i === d1i) continue;
              const d2 = detectedPoints[d2i];
              combosTried++;

              const t = fitAffineFromTriplets([r0, r1, r2], [d0, d1, d2]);
              if (!t) continue;
              fitsOk++;
              if (affineFilter && !affineFilter(t)) continue;
              fitsPassedAffineFilter++;

              // Cheap-score prune, same as constrained-random —
              // with early-exit via minRequired so cheapScore itself
              // bails on hopeless candidates instead of always
              // iterating all ref points.
              const minRequired = Math.ceil(bestScore / (1 + TIGHTNESS_BONUS));
              const tCheap0 = Date.now();
              const cheap = cheapScoreUpperBound(
                t,
                refPoints,
                detectedPoints,
                pixelThreshold,
                minRequired,
              );
              cheapScoreMs += Date.now() - tCheap0;
              if (cheap * (1 + TIGHTNESS_BONUS) < bestScore) continue;
              cheapScorePassed++;

              const tFit0 = Date.now();
              const s = scoreTransform(
                t,
                refPoints,
                detectedPoints,
                pixelThreshold,
              );
              scoreFitMs += Date.now() - tFit0;
              if (s > bestScore) {
                bestScore = s;
                bestT = t;
                bestRefTri = [r0, r1, r2];
                bestDetTri = [d0, d1, d2];
                bestScoreUpdates++;
              }
            }
          }
        }
      }
    }
  }

  if (profile) {
    profile.tlCandidatePool = tlPool;
    profile.trCandidatePool = trPool;
    profile.blCandidatePool = blPool;
    profile.tripletsTried = tripletsTried;
    profile.combosTried = combosTried;
    profile.fitsOk = fitsOk;
    profile.fitsPassedAffineFilter = fitsPassedAffineFilter;
    profile.cheapScorePassed = cheapScorePassed;
    profile.cheapScoreMs = cheapScoreMs;
    profile.scoreFitMs = scoreFitMs;
    profile.bestScoreUpdates = bestScoreUpdates;
    profile.slopX = slopX;
    profile.slopY = slopY;
  }

  if (!bestT || !bestRefTri || !bestDetTri) return null;

  // Same LSQ refinement as constrained-random — spread residual error
  // across all inliers rather than leaning on the winning triplet.
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
