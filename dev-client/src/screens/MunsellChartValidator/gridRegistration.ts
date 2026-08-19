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

import {computeChartGuideRect} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {
  blobH,
  blobW,
  findFlatCircles,
  maskToSpans,
  type Blob,
  type GrayImage,
  type Region,
} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';
import {
  applyAffine,
  composeAffineFilters,
  createRandomTripletIterator,
  DEFAULT_REGISTRATION_ALGORITHM,
  findBestTransformDirectedQuadrant,
  findBestTransformViaPairs,
  notTooSkewed,
  REFERENCE_GRID,
  SAMPLE_GRID,
  scaleInRange,
  similarScales,
  type DirectedQuadrantProfile,
  type PairsProfile,
  type Point,
  type RegistrationAlgorithm,
} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {
  CHART_CHROMAS,
  CHART_HUE,
  CHART_VALUES,
  MUNSELL_10YR_CELLS,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';

// Minimum area (in pixels) for a blob to show up on the debug
// overlay. Below this it's almost certainly single-pixel noise from
// JPEG compression / demosaic ringing / etc. — rendering hundreds of
// those obliterates the useful signal. Just skips them from the
// overlay; the shape filter downstream sets its own minimums.
const DEBUG_MIN_BLOB_AREA = 30;

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

// One raw blob bounding box, with a tag for why it was accepted or
// rejected. Used purely for the debug overlay — the pipeline itself
// works from the internal Blob list.
export type DebugBlob = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  area: number;
  // Simplified status set — the old kept_dark / kept_bright split is
  // gone (both consolidated to `kept`); reject_aspect / reject_fill /
  // reject_mindim / reject_low_contrast are gone too (they used to
  // gate shape-and-contrast for the older blob-based detector, which
  // is now dead code — findFlatCircles already ensures aspect=1,
  // fill=π/4, min-dim ≥ 2·minR, so the checks always passed and just
  // added noise). Every remaining reject reason maps to a specific
  // failure mode you'd want to see on the debug overlay:
  //   kept                  — passed all checks, fed to RANSAC
  //   reject_area_low       — inscribed circle too small (< minR)
  //   reject_area_high      — inscribed circle too big (> maxR)
  //   reject_touches_edge   — circle bbox on the outer image edge
  //   reject_outside_guide  — circle centre falls outside the
  //                           capture-time chart guide rect (chart
  //                           is expected to fit inside the guide, so
  //                           anything outside it is paper-shell noise
  //                           or a stray region)
  status:
    | 'kept'
    | 'reject_area_low'
    | 'reject_area_high'
    | 'reject_touches_edge'
    | 'reject_outside_guide';
};

export type GridDetection = {
  centers: CellCenters;
  // Approximate swatch pixel size from the CLUSTERING-based affine
  // (early stage — before RANSAC). Kept for the fallback path when
  // RANSAC couldn't lock a match. Downstream sizing (sample rects)
  // should prefer matchedColStepPx / matchedRowStepPx below when
  // available — those come from the RANSAC affine which is more
  // reliable and can differ significantly from the cluster fit on
  // sparse pages / warped layouts.
  cellW: number;
  cellH: number;
  // Per-axis chip spacing in preview pixels from the RANSAC affine
  // (`Math.hypot(a*2, d*2)` for cols, `Math.hypot(b*3, e*3)` for
  // rows — the "2" and "3" match the chart's ref-grid unit spacing).
  // Null when the RANSAC step didn't lock a match.
  matchedColStepPx: number | null;
  matchedRowStepPx: number | null;
  // Diagnostic: which grid positions were directly detected (as
  // opposed to affine-extrapolated). Rendered as dots on the "Source
  // + ROIs" validation view.
  detected: GridEntry[];
  // Diagnostic: every raw blob the CC pass produced (above a small
  // pixel-noise floor), tagged with why the shape filter kept or
  // rejected it. Rendered as colour-coded bounding boxes on the
  // source overlay so a tester can see whether the detector is
  // missing real swatches (e.g. merged mega-blobs rejected by
  // aspect) vs. picking up junk (Post-It edges).
  rawBlobs: DebugBlob[];
  // Diagnostic: bounding box of the chart body (medium-grey card
  // material), used to restrict hole search to inside the chart.
  // Null if the chart body detector couldn't identify a plausible
  // card, in which case hole detection ran on the full image. Drawn
  // as a cyan outline on the source overlay.
  chartBodyBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
  // Diagnostic: run-length spans of the FINAL bright mask that
  // connected-components ran on (post threshold, post chart-body
  // restriction, post morphological open). If a hole is missing
  // from `detected` but IS in these spans, the CC filter is
  // eating it (probably merged into a reject_area_high blob). If
  // it's NOT in these spans, either the threshold missed it or
  // the chart-body restriction zeroed it out. Rendered as
  // semi-transparent white overlay on the source view.
  brightMaskSpans: {x: number; y: number; w: number; h: number}[];
  // Diagnostic: run-length spans of the CHART BODY mask (bandpass
  // over medium-brightness). Its largest connected component is
  // what defines chartBodyBounds. If the chart body detector is
  // cutting off half the chart, the split will be visible here.
  // Rendered as semi-transparent magenta.
  chartBodyMaskSpans: {x: number; y: number; w: number; h: number}[];
  // NEW APPROACH — matched grid points. 36 preview-space positions
  // where the reference 6×6 grid landed after the best-fit affine
  // was computed via RANSAC-style triplet matching against the
  // detected circle centres. Rendered as yellow dots on the source
  // overlay, replacing the cluster-fit yellow dots when present.
  // Null if the match step didn't run or failed.
  matchedGrid: {x: number; y: number}[] | null;
  // Per-ref-point boolean, parallel to matchedGrid: true if that
  // ref point found a detected point within matchThreshold under
  // the winning transform (i.e. counted as an inlier for scoring),
  // false otherwise. Rendered by filling matched yellow rings so
  // the tester can see which ref points contributed to the score.
  // Null when matchedGrid is null.
  matchedGridInliers: boolean[] | null;
  // Score for the winning transform (continuous score from
  // scoreTransform). Shown in the debug legend.
  matchedScore: number | null;
  // Number of ref-grid points RANSAC was run against. Denominator for
  // the legend's "score / max" and the "inliers / refCount" display —
  // per-page ref grids have fewer points than the universal MAX
  // REFERENCE_GRID (e.g. 30 for 10YR vs 35 universal), so the legend
  // can't derive this from REFERENCE_GRID.length. Null when the match
  // step didn't run.
  matchedRefCount: number | null;
  // The 3 DETECTED points that formed the winning ref↔detected
  // triplet correspondence. Rendered as prominent red rings so a
  // tester can see which 3 anchors the whole transform was built
  // from. Null if the match step didn't run or failed.
  matchedTripletDetected: {x: number; y: number}[] | null;
  // SAMPLE_GRID points transformed into preview-space, expanded to
  // square ROIs. 48 rects (8 rows × 6 cols). These are the
  // rectangles that get sampled for per-swatch color values.
  // Rendered as red outlines on the source overlay and used by
  // downstream sampling. Null if the match step didn't run.
  matchedSampleRects: {x: number; y: number; w: number; h: number}[] | null;
  // Grayscale (Rec.709 luma, 0-255) sampled from the preview at each
  // matchedGrid centre — useful diagnostic for "why did this hole
  // NOT get detected?": compare each value to the classifier's
  // paper midpoint (paperLuma + avgLuma)/2. On bright_paper, values
  // BELOW midpoint would be rejected by isPaperCentre. Same
  // ordering / length as matchedGrid. Null when matchedGrid is null.
  matchedGridBrightness: number[] | null;
  // Whole-image average brightness (Rec.709 luma, computed inline in
  // detectChartByRegions). Combined with paperLuma to feed the
  // classifier's midpoint threshold; also useful downstream for
  // regression tracking of "was this a bright-bg or dark-bg capture".
  avgLuma: number;
  // Paper anchor brightness from whiteMask border-cal (may be null
  // when the ring didn't yield enough samples and whiteMask fell back
  // to the percentile path).
  paperLuma: number | null;
  // Median per-channel R/G/B of the whiteMask border ring, in
  // preview-image space (gamma-encoded sRGB, 0–255). Same source as
  // paperLuma. Null when the ring calibration didn't run. Used by
  // analyze-fixtures to synthesise a 'paper' ref card for LIGHT BG
  // captures — the surrounding paper is a known-neutral reflector,
  // so its measured colour becomes a WB reference point alongside
  // whibal / postit / greycard.
  paperMedianR: number | null;
  paperMedianG: number | null;
  paperMedianB: number | null;
  // True when paperLuma > avgLuma (chart paper is brighter than the
  // surroundings). False in the flipped case (paper darker than
  // surroundings, e.g. chart on a bright table). Null when paperLuma
  // is null.
  brightPaperOnDark: boolean | null;
  // Count of "kept" classifications (matches DebugBlob[].status ===
  // 'kept'). Same value the constrained-random matcher sees as its
  // detected-circle count.
  nKept: number;
  // Full per-status counts from the classifier — useful for
  // pin-pointing which reject bucket is dropping candidates on a
  // problematic fixture.
  rejectCounts: {
    area_low: number;
    area_high: number;
    touches_edge: number;
    outside_guide: number;
  };
  // Max per-ref-point horizontal / vertical displacement from the
  // "ideal" guide-aligned position, expressed as a fraction of the
  // ideal cell spacing. Diagnostic for "did RANSAC land the chart
  // one column too far right?". Computed against the same
  // fullChartBounds (0..10, 0..15) the RANSAC uses, mapped uniformly
  // to guideRect. A translation shift shows as constant Δ across
  // all points; a scale mismatch grows with distance from centre.
  // 0.0 = perfect alignment; 1.0 = a whole column/row-step off;
  // null when guideRect or matchedGrid is unavailable.
  maxHOffsetFrac: number | null;
  maxVOffsetFrac: number | null;
};

// -----------------------------------------------------------------
// Chip-hole detection pipeline (only one now — two older detectors
// were removed with the classifier simplification). Inputs:
//   - grayscale preview
//   - binary mask of "paper-like" pixels (whiteMask output — includes
//     paper background + chip-hole interiors, EXCLUDES chart body)
//   - reference / sample grids for the specific page
//   - paperLuma from whitemask border-ring calibration
//   - avgLuma of the whole preview
// Output: kept circles at chip-hole centres, plus per-blob debug
// annotations for the source overlay.
//
// Classifier decides which findFlatCircles-emitted circle is a real
// chip hole by comparing its centre pixel to the paper anchor, in a
// way that adapts to both bright-background and dark-background
// setups. See classifyRegion below.

// Radius range for a chip hole, as a fraction of the preview's
// SHORTER dimension — aspect- and pixel-count-independent (same
// fractions apply to any phone's preview). With the chart-guide
// framing (chart fills most of the frame), a real hole spans
// roughly 3% of the shorter dimension; the permissive [0.02, 0.09]
// range keeps us robust to under- and over-framing.
const MIN_HOLE_RADIUS_FRAC = 0.02;
const MAX_HOLE_RADIUS_FRAC = 0.09;
export const detectChartByRegions = (
  img: GrayImage,
  // Precomputed binary mask (same dimensions as img) marking pixel
  // regions that findFlatCircles should inscribe circles into. Caller
  // owns the mask-building strategy — the Munsell chart validator now
  // uses whiteMask (paper-white + neutral chroma) so every hole shows
  // as its own isolated 1-region enclosed by the chart body.
  mask: GrayImage,
  // Reference grid RANSAC fits against. Default is the universal MAX
  // across all pages (any real chart's holes contribute to scoring).
  // Pass a per-page grid when the caller knows which page the DNG is
  // of — RANSAC then can't "win" by matching a fit that lines up with
  // ref points where THIS page has no chip.
  refGrid: readonly Point[] = REFERENCE_GRID,
  // Which registration algorithm to run against the detected circles.
  // Hole-detection (findFlatCircles + classifyRegion) is shared; only
  // the ref-to-detected matching step branches on this. See
  // RegistrationAlgorithm for the current set and matchAlgorithm.ts
  // for the runners.
  algorithm: RegistrationAlgorithm = DEFAULT_REGISTRATION_ALGORITHM,
  // Sample-grid template — the CHIP positions (plus any extras like
  // TEST_SWATCH_POINT) the caller wants transformed into pixel
  // rectangles once the fit is found. Default is the universal MAX
  // sample grid across all pages, which includes chip positions no
  // specific page has — passing a per-page sample grid keeps
  // matchedSampleRects tight to the actual chart being analysed
  // (so debug-overlay red rects don't appear at positions the page
  // doesn't populate — e.g., WHITE's empty physical column 0).
  sampleGrid: readonly Point[] = SAMPLE_GRID,
  // Rec.709 luma of the calibrated "paper" colour (from whiteMask's
  // border-ring calibration). Threaded into classifyRegion, where
  // it's combined with the whole-image avgLuma to decide the
  // "is this circle's centre pixel paper?" midpoint threshold.
  // Handles both bright-paper-on-dark-bg and dark-paper-on-bright-bg
  // captures without hard-coding a value. Null → fallback path
  // (absolute cutoff at FALLBACK_BRIGHT_MIN=170).
  paperLuma: number | null = null,
  // Capture-time chart guide rectangle in preview-space pixels. When
  // supplied, circles whose CENTRE falls outside the rect are
  // rejected as `reject_outside_guide` — the chart is expected to fit
  // inside the guide, so anything outside it is paper-shell noise
  // near the frame edge (dark-background captures generate lots of
  // these). Null → no guide-based rejection (all circles considered).
  guideRect: {x: number; y: number; w: number; h: number} | null = null,
): GridDetection | null => {
  const tStartAll = Date.now();
  // 1. Find inscribed circles in the mask. Distance transform gives,
  //    at every 1-pixel, the max radius circle that fits inside a
  //    1-region centred there. Take the local maxima with radius in
  //    [minRadius, maxRadius] and greedy-keep largest-first, dropping
  //    any candidate that overlaps a kept circle. Bounds are derived
  //    from the shorter frame dimension so they're pixel-count- AND
  //    aspect-ratio-independent (different phones = different sensor
  //    resolutions and aspects; same fractions apply everywhere).
  const shorterDim = Math.min(img.width, img.height);
  const minRadius = Math.max(5, MIN_HOLE_RADIUS_FRAC * shorterDim);
  const maxRadius = MAX_HOLE_RADIUS_FRAC * shorterDim;
  const minArea = Math.PI * minRadius * minRadius;
  const maxArea = Math.PI * maxRadius * maxRadius;
  const tBeforeFindCircles = Date.now();
  const circles = findFlatCircles(mask, minRadius, maxRadius);
  const tAfterFindCircles = Date.now();

  // Wrap each circle as a Region — same shape as before so the
  // classifier / clusterer / fitter don't change. Bounding box is
  // the circle's inscribing square; mean brightness = centre pixel.
  const regions: Region[] = circles.map(c => {
    const rInt = Math.round(c.r);
    const cxInt = Math.round(c.cx);
    const cyInt = Math.round(c.cy);
    return {
      label: 0,
      area: Math.PI * c.r * c.r,
      minX: cxInt - rInt,
      minY: cyInt - rInt,
      maxX: cxInt + rInt,
      maxY: cyInt + rInt,
      cx: c.cx,
      cy: c.cy,
      meanBrightness: img.pixels[cyInt * img.width + cxInt],
    };
  });
  const tAfterRegionWrap = Date.now();

  // 3. Classify and filter. Each candidate circle is a "kept" chip
  //    hole if its centre pixel looks like paper (see classifyRegion
  //    + isPaperCentre); anything else is a reject.
  //
  //    avgLuma = mean brightness across the whole preview. Combined
  //    with paperLuma from the whitemask border-ring calibration,
  //    the midpoint (paperLuma + avgLuma) / 2 is used as a threshold:
  //    kept iff the centre pixel is on the paper side of that
  //    midpoint. Adapts to bright-on-dark and dark-on-bright captures
  //    without hard-coding a value.
  const avgLuma = meanLuma(img);
  const tagged = regions.map(r => ({
    region: r,
    status: classifyRegion(r, img, minArea, maxArea, guideRect),
  }));
  const tAfterClassify = Date.now();
  // Detected candidates fed to RANSAC (single polarity now — old
  // kept_dark path removed with the classifier simplification).
  const candidates = tagged.filter(t => t.status === 'kept').map(t => t.region);
  // Per-status breakdown for the debug log. Fires on every analysis
  // (success or failure) so a tester can see whether chip holes were
  // (a) not detected as circles at all (small `kept` count), (b)
  // rejected as `reject_brightness` (centre pixel wrong side of the
  // paper/avg midpoint — check paperLuma vs. avgLuma direction), or
  // (c) OK but RANSAC couldn't fit (`kept` count fine but analysis
  // failed downstream). Also logs the paper anchor + avg + midpoint
  // so the direction (`bright_paper` vs `dark_paper`) is visible.
  const statusCounts = tagged.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  const paperLumaStr = paperLuma !== null ? paperLuma.toFixed(0) : 'null';
  const direction =
    paperLuma === null
      ? 'fallback'
      : paperLuma > avgLuma
        ? 'bright_paper'
        : 'dark_paper';
  const midpoint =
    paperLuma !== null ? (0.5 * (paperLuma + avgLuma)).toFixed(0) : 'n/a';
  console.log(
    `[detectChartByRegions] classify: ` +
      `${circles.length} raw circles → ${Object.entries(statusCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')} ` +
      `(paperLuma=${paperLumaStr}, avgLuma=${avgLuma.toFixed(0)}, ` +
      `midpoint=${midpoint}, direction=${direction})`,
  );
  const rawBlobs: DebugBlob[] = tagged
    .filter(t => t.region.area >= DEBUG_MIN_BLOB_AREA)
    .map(t => ({
      minX: t.region.minX,
      minY: t.region.minY,
      maxX: t.region.maxX,
      maxY: t.region.maxY,
      cx: t.region.cx,
      cy: t.region.cy,
      area: t.region.area,
      status: t.status,
    }));
  if (candidates.length < 6) {
    console.log(
      `[detectChartByRegions] null: too few candidates ` +
        `(${candidates.length} < 6; raw circles=${circles.length})`,
    );
    return null;
  }

  // 3. Cluster surviving candidates by y (rows) and x (cols). Dark
  //    swatches and bright holes sit on the same grid columns; they
  //    differ by ~half a cell in y, so they may form 2× the row
  //    clusters expected. The endpoint prune below handles that.
  const medianH = median(candidates.map(b => blobH(b)));
  const medianW = median(candidates.map(b => blobW(b)));
  const rowClusters = clusterByAxis(candidates, b => b.cy, medianH * 0.6);
  const colClusters = clusterByAxis(candidates, b => b.cx, medianW * 0.6);
  if (rowClusters.length < 2 || colClusters.length < 2) {
    console.log(
      `[detectChartByRegions] null: too few clusters ` +
        `(rows=${rowClusters.length}, cols=${colClusters.length}; ` +
        `candidates=${candidates.length}, medianH=${medianH.toFixed(1)}, ` +
        `medianW=${medianW.toFixed(1)})`,
    );
    return null;
  }

  // Cluster info: keep the member count alongside the center so we
  // can trim by count later. Spurious clusters (binder holes on the
  // chart's left margin form a legitimate-looking column at chart-
  // spacing distance) often have far fewer members than real
  // chroma / value clusters and can be dropped that way even when
  // gap-based pruning can't catch them.
  const rowInfoAll = rowClusters
    .map(c => ({center: median(c.map(b => b.cy)), count: c.length}))
    .sort((a, b) => a.center - b.center);
  const colInfoAll = colClusters
    .map(c => ({center: median(c.map(b => b.cx)), count: c.length}))
    .sort((a, b) => a.center - b.center);

  // 1. Endpoint gap-prune: reject front / back clusters whose gap
  //    to their inner neighbour is much larger than the norm.
  const rowKeptSet = new Set(
    pruneEndpointOutliers(rowInfoAll.map(x => x.center)),
  );
  const colKeptSet = new Set(
    pruneEndpointOutliers(colInfoAll.map(x => x.center)),
  );
  const rowInfoPruned = rowInfoAll.filter(x => rowKeptSet.has(x.center));
  const colInfoPruned = colInfoAll.filter(x => colKeptSet.has(x.center));

  // 2. Loosen the trim — cap at template + 2 so downstream
  //    enumeration can try different subsets rather than being
  //    forced into whichever N-T clusters count-trim happened to
  //    drop. Real chart features and same-spacing spurious
  //    clusters (e.g. binder holes) often have similar member
  //    counts, so counts alone don't reliably pick the right
  //    cluster to drop.
  const rowInfoFinal = trimToTemplateCount(
    rowInfoPruned,
    CHART_VALUES.length + 2,
  );
  const colInfoFinal = trimToTemplateCount(
    colInfoPruned,
    CHART_CHROMAS.length + 2,
  );
  const rowClusterCenters = rowInfoFinal.map(x => x.center);
  const colClusterCenters = colInfoFinal.map(x => x.center);
  if (rowClusterCenters.length < 2 || colClusterCenters.length < 2) {
    console.log(
      `[detectChartByRegions] null: after prune/trim, cluster count too low ` +
        `(rows=${rowClusterCenters.length}, cols=${colClusterCenters.length}; ` +
        `pre-trim rows=${rowInfoAll.length}, cols=${colInfoAll.length})`,
    );
    return null;
  }

  // 3. Brightness-match search. For every viable combination of
  //    (rowSubset, colSubset, rowOffset, colOffset), fit the affine
  //    and score against the expected 10YR-chart brightness pattern.
  //    Winner is the assignment whose extrapolated cell centres land
  //    closest to the pixel values the template predicts — much
  //    stronger evidence than "cluster with the most members"
  //    because it uses the whole chart's darker-lower / lighter-
  //    higher-value pattern to disambiguate.
  // Chip holes always sit half a row-step BELOW the corresponding
  // swatch (physically, the swatch is above the comparison hole), so
  // to convert detected hole centres back to swatch centres we shift
  // by -0.5 in template row-steps. Was toggled by useBrightAnchors
  // when the classifier had a dark-swatch branch; now that path is
  // gone (see classifyRegion) so it's a constant.
  const swatchOffsetInRowSteps = -0.5;
  const rowKeep = Math.min(rowClusterCenters.length, CHART_VALUES.length);
  const colKeep = Math.min(colClusterCenters.length, CHART_CHROMAS.length);
  let bestXCoeffs: [number, number, number] | null = null;
  let bestYCoeffs: [number, number, number] | null = null;
  let bestDetected: GridEntry[] | null = null;
  let bestScore = Infinity;
  for (const rowKeeps of enumerateSubsets(rowClusterCenters.length, rowKeep)) {
    const rowSub = rowKeeps.map(i => rowClusterCenters[i]);
    const missingRows = CHART_VALUES.length - rowSub.length;
    for (const colKeeps of enumerateSubsets(
      colClusterCenters.length,
      colKeep,
    )) {
      const colSub = colKeeps.map(i => colClusterCenters[i]);
      const missingCols = CHART_CHROMAS.length - colSub.length;
      for (let rowOff = 0; rowOff <= missingRows; rowOff++) {
        for (let colOff = 0; colOff <= missingCols; colOff++) {
          const detected: GridEntry[] = [];
          const sX: [number, number, number][] = [];
          const sY: [number, number, number][] = [];
          for (const b of candidates) {
            const rIdx = nearestIndex(rowSub, b.cy);
            const cIdx = nearestIndex(colSub, b.cx);
            const dx = Math.abs(b.cx - colSub[cIdx]);
            const dy = Math.abs(b.cy - rowSub[rIdx]);
            if (dx >= medianW || dy >= medianH) continue;
            const rowIdx = rowOff + rIdx;
            const colIdx = colOff + cIdx;
            detected.push({rowIdx, colIdx, cx: b.cx, cy: b.cy});
            sX.push([colIdx, rowIdx, b.cx]);
            sY.push([colIdx, rowIdx, b.cy]);
          }
          if (detected.length < 6) continue;
          const xC = leastSquares3(sX);
          const yC = leastSquares3(sY);
          if (!xC || !yC) continue;
          const score = scoreFit(xC, yC, img, swatchOffsetInRowSteps);
          if (score < bestScore) {
            bestScore = score;
            bestXCoeffs = xC;
            bestYCoeffs = yC;
            bestDetected = detected;
          }
        }
      }
    }
  }
  if (!bestXCoeffs || !bestYCoeffs || !bestDetected) {
    console.log(
      `[detectChartByRegions] null: brightness-match search found no ` +
        `viable (rowSubset,colSubset,offset) — no candidate subset had ` +
        `>=6 in-tolerance blobs (rowClusters=${rowClusterCenters.length}, ` +
        `colClusters=${colClusterCenters.length}, candidates=${candidates.length})`,
    );
    return null;
  }
  const xCoeffs = bestXCoeffs;
  const yCoeffs = bestYCoeffs;
  const detected = bestDetected;

  // Swatch offset — when anchored on bright HOLES, fitted centres
  // are hole centres; each swatch sits half a row-step above its
  // hole. Shift along the fitted row-step vector so rotation stays
  // honest. When anchored on dark RECTANGLES, no shift needed —
  // fitted centres are already swatch centres.
  const offsetX = xCoeffs[1] * swatchOffsetInRowSteps;
  const offsetY = yCoeffs[1] * swatchOffsetInRowSteps;
  const centers: CellCenters = [];
  for (let r = 0; r < CHART_VALUES.length; r++) {
    const row: {x: number; y: number}[] = [];
    for (let c = 0; c < CHART_CHROMAS.length; c++) {
      row.push({
        x: xCoeffs[0] * c + xCoeffs[1] * r + xCoeffs[2] + offsetX,
        y: yCoeffs[0] * c + yCoeffs[1] * r + yCoeffs[2] + offsetY,
      });
    }
    centers.push(row);
  }

  const cellW = Math.hypot(xCoeffs[0], yCoeffs[0]);
  const cellH = Math.hypot(xCoeffs[1], yCoeffs[1]);

  // NEW APPROACH — RANSAC triplet-match against the reference grid.
  // Take the bright circle centres (holes are the most reliable
  // detections; dark rects are sparse) and find the affine that
  // maps REFERENCE_GRID onto them with the most inliers. Then apply
  // that affine to REFERENCE_GRID to get the predicted grid points
  // for rendering as yellow dots.
  //
  // Match threshold = cellH * 0.4 — roughly one hole-radius, so a
  // ref point counts as matched if it lands anywhere near a real
  // detected circle. Early exit at 30/36 matches (near-perfect) so
  // typical clean captures return quickly instead of grinding
  // through the full C(N,3)² sweep.
  const keptRegions = tagged
    .filter(t => t.status === 'kept')
    .map(t => t.region);
  const detectedPoints: Point[] = keptRegions.map(r => ({
    x: r.cx,
    y: r.cy,
  }));
  const tAfterCircles = Date.now();
  let matchedGrid: {x: number; y: number}[] | null = null;
  let matchedGridInliers: boolean[] | null = null;
  let matchedColStepPx: number | null = null;
  let matchedRowStepPx: number | null = null;
  let matchedScore: number | null = null;
  let matchedRefCount: number | null = null;
  let matchedTripletDetected: {x: number; y: number}[] | null = null;
  let matchedSampleRects:
    | {x: number; y: number; w: number; h: number}[]
    | null = null;
  let matchedGridBrightness: number[] | null = null;
  let maxHOffsetFrac: number | null = null;
  let maxVOffsetFrac: number | null = null;
  if (detectedPoints.length >= 3) {
    // Tightened from 0.4 to 0.2 of cellH — 0.4 was roughly half a
    // row-step which is bigger than one whole hole, so many wrong
    // transforms could still score high. 0.2 is roughly a hole
    // radius, so a ref-to-detected match requires the transformed
    // ref to land inside or very near a real detected hole.
    // Middle-ground between the original 0.2 (~20 px, too loose —
    // wandered onto neighbours) and the first tighten to 0.1 (~10 px,
    // too tight — dropped legitimate matches 12-15 px off due to
    // capture wobble / perspective drift). 0.15 tolerates real
    // registration slop across a slightly-tilted chart without
    // counting matches that are visibly off.
    const matchThreshold = Math.max(8, cellH * 0.15);
    // Outer (ref) iterator: 1000 random triplets — enough to cover
    // most valid ref triplets after distinctRowsAndCols +
    // isNonCollinear filtering (~1500-2500 pass with the 35-point
    // MAX ref grid). 100 was too few, letting wrong-alignment fits
    // that scored ~25 win over the correct 30-match alignment
    // because the correct triplet just wasn't sampled. Inner
    // (detected) iterator: exhaustive.
    const OUTER_TRIPLET_COUNT = 1000;
    const refIterator = createRandomTripletIterator(OUTER_TRIPLET_COUNT);
    const tStart = Date.now();
    // Skew tolerance: 15° off perpendicular. Real chart-photo affines
    // sit well under 5° (chart is flat, camera roughly overhead); a
    // 30°+ skew is the fingerprint of a bad triplet whose 3 detections
    // happen to line up in a way that fits a degenerate transform.
    //
    // Aspect-scale tolerance: |colX| / |colY| within 1.6× either way.
    // REFERENCE_GRID's 2-unit col-step / 3-unit row-step already
    // encodes the chart's real physical aspect, so a valid transform
    // should map both ref axes at the SAME pixels-per-unit. A
    // wrong-pairing fit (right triplet, wrong index assignment)
    // typically produces a wildly-different scale ratio to reach the
    // mispaired detected point, so this catches that class of bad
    // fit without rejecting real perspective tilt.
    //
    // Absolute-scale range: with the chart-validator guide framing
    // the chart at ~80% of the shorter preview dim and the ref grid
    // spanning 10 units horizontally, expected pixels-per-unit is
    // ~0.08 × shorterDim. Allow 0.04-0.13 (roughly half to 1.6× the
    // nominal) to accommodate framing variance while still rejecting
    // compressed / stretched fits that would otherwise sneak by the
    // ratio-only filters and win by matching paper-margin false-
    // positives. Neither notTooSkewed nor similarScales catches
    // uniform compression — they both stay ratio-matched under it.
    const shorterPreviewDim = Math.min(img.width, img.height);
    const minPxPerUnit = 0.04 * shorterPreviewDim;
    const maxPxPerUnit = 0.13 * shorterPreviewDim;
    // Fast RANSAC via 2-point similarity prediction (see
    // findBestTransformViaPairs). Turns the inner O(N³) detected
    // enumeration into O(N²) + O(N) nearest-lookup per predicted
    // third — same final fit quality (full 3-point affine + LSQ
    // refinement over inliers), ~25× faster in practice.
    // Common affine gate for both algorithms — kills degenerate
    // transforms early (see comments on notTooSkewed / similarScales /
    // scaleInRange for what each one catches).
    const affineFilter = composeAffineFilters(
      notTooSkewed(15),
      similarScales(1.6),
      scaleInRange(minPxPerUnit, maxPxPerUnit),
    );
    // Algorithm dispatch. Both branches consume the SAME detectedPoints
    // and return the SAME {transform, score, refTriplet, detectedTriplet}
    // shape, so downstream sample-rect / inlier / debug rendering is
    // agnostic. Adding a new algorithm = add an id to
    // REGISTRATION_ALGORITHMS + a runner in matchAlgorithm.ts + a case
    // below.
    let match: ReturnType<typeof findBestTransformViaPairs> = null;
    const crProfile: PairsProfile = {
      refTripletsTried: 0,
      pairsTried: 0,
      pairsPassedSameOrder2: 0,
      fitsAttempted: 0,
      fitsOk: 0,
      fitsPassedAffineFilter: 0,
      cheapScorePassed: 0,
      cheapScoreMs: 0,
      scoreFitMs: 0,
      bestScoreUpdates: 0,
    };
    const dqProfile: DirectedQuadrantProfile = {
      tlCandidatePool: 0,
      trCandidatePool: 0,
      blCandidatePool: 0,
      tripletsTried: 0,
      combosTried: 0,
      fitsOk: 0,
      fitsPassedAffineFilter: 0,
      cheapScorePassed: 0,
      cheapScoreMs: 0,
      scoreFitMs: 0,
      bestScoreUpdates: 0,
      slopX: 0,
      slopY: 0,
    };
    switch (algorithm) {
      case 'constrained-random':
        match = findBestTransformViaPairs(
          refGrid,
          detectedPoints,
          matchThreshold,
          undefined,
          refIterator,
          affineFilter,
          undefined,
          crProfile,
        );
        break;
      case 'directed-quadrant': {
        // Guide rect at capture time in preview-image coords. The
        // algorithm needs this to seed its nominal ref→image affine —
        // see the header comment on findBestTransformDirectedQuadrant.
        // Computed against the preview image dims (img.width/height)
        // since detectedPoints are in preview-image space.
        // Prefer the caller-supplied guide rect when available (it's
        // already the same computation), else recompute from image
        // dims. Local name distinct from the outer `guideRect` param
        // to satisfy the no-shadow lint rule.
        const matchGuideRect =
          guideRect ?? computeChartGuideRect(img.width, img.height);
        // Canonical full-chart bounds in ref-grid coord space. Every
        // Munsell soil-color-book page shares the same physical
        // 7-chip-row × 6-chip-col grid, which in ref-grid coords
        // spans y=0..15 (hole rows 0..5 at y=holeRow*3) and x=0..10
        // (chip cols 0..5 at x=col*2). Passing these forces the
        // nominal ref→image affine to map the FULL card onto the
        // guide rect, so pages that populate only a subset of holes
        // (e.g. 10Y-5GY's 3 hole rows × 4 cols) get correct nominal
        // expected positions inside the guide rather than being
        // stretched across the whole guide.
        const fullChartBounds = {minX: 0, maxX: 10, minY: 0, maxY: 15};
        match = findBestTransformDirectedQuadrant(
          refGrid,
          detectedPoints,
          matchThreshold,
          affineFilter,
          matchGuideRect,
          undefined,
          dqProfile,
          fullChartBounds,
        );
        break;
      }
    }
    const tEndAll = Date.now();
    const circlesMs = tAfterCircles - tStartAll;
    const ransacMs = tEndAll - tStart;
    const totalMs = tEndAll - tStartAll;
    // Sub-buckets of the "circles" phase:
    //   findFlatCircles — distance transform + local-max hole picking
    //   regionWrap      — one small object allocation per circle
    //   classify        — per-region brightness / aspect / fill / edge checks
    //   circlesOther    — everything else attributed to circles (should be
    //                     small: the clustering / prune / brightness-match
    //                     search runs AFTER tAfterClassify).
    const findCirclesMs = tAfterFindCircles - tBeforeFindCircles;
    const regionWrapMs = tAfterRegionWrap - tAfterFindCircles;
    const classifyMs = tAfterClassify - tAfterRegionWrap;
    const circlesOtherMs =
      circlesMs - findCirclesMs - regionWrapMs - classifyMs;
    // Score max = refGrid.length * (1 + TIGHTNESS_BONUS) = refGrid.length * 1.1.
    // Keep both scoreMax AND refGrid.length in the log so it's obvious
    // when a per-page grid is smaller than the universal MAX (e.g. 30
    // for 10YR vs 35 universal).
    const scoreMax = refGrid.length * 1.1;
    console.log(
      `[chart-match:${algorithm}] ${detectedPoints.length} detected; ` +
        `circles ${circlesMs}ms (findFlatCircles=${findCirclesMs} ` +
        `regionWrap=${regionWrapMs} classify=${classifyMs} ` +
        `other=${circlesOtherMs}), ` +
        `RANSAC ${ransacMs}ms, total ${totalMs}ms; ` +
        `score=${match?.score?.toFixed(2) ?? 'null'} / ${scoreMax.toFixed(1)} ` +
        `(${refGrid.length} ref pts)`,
    );
    // Per-stage counters — one line per algorithm, per-stage counts +
    // per-block wall-time so we can see where the budget went.
    if (algorithm === 'constrained-random') {
      const otherMs = ransacMs - crProfile.cheapScoreMs - crProfile.scoreFitMs;
      console.log(
        `[chart-match:profile] refTri=${crProfile.refTripletsTried} ` +
          `pairs=${crProfile.pairsTried} ` +
          `→sameOrder2=${crProfile.pairsPassedSameOrder2} ` +
          `→predHit=${crProfile.fitsAttempted} ` +
          `→fitOk=${crProfile.fitsOk} ` +
          `→postAffFilt=${crProfile.fitsPassedAffineFilter} ` +
          `→cheapPass=${crProfile.cheapScorePassed} ` +
          `bestUpdates=${crProfile.bestScoreUpdates}; ` +
          `time: other≈${otherMs}ms, cheapScore=${crProfile.cheapScoreMs}ms, ` +
          `scoreFit=${crProfile.scoreFitMs}ms`,
      );
    } else if (algorithm === 'directed-quadrant') {
      const otherMs = ransacMs - dqProfile.cheapScoreMs - dqProfile.scoreFitMs;
      console.log(
        `[chart-match:profile] slop=±${dqProfile.slopX.toFixed(0)}×${dqProfile.slopY.toFixed(0)}px ` +
          `cand-pool tl/tr/bl=${dqProfile.tlCandidatePool}/${dqProfile.trCandidatePool}/${dqProfile.blCandidatePool} ` +
          `triplets=${dqProfile.tripletsTried} combos=${dqProfile.combosTried} ` +
          `→fitOk=${dqProfile.fitsOk} ` +
          `→postAffFilt=${dqProfile.fitsPassedAffineFilter} ` +
          `→cheapPass=${dqProfile.cheapScorePassed} ` +
          `bestUpdates=${dqProfile.bestScoreUpdates}; ` +
          `time: other≈${otherMs}ms, cheapScore=${dqProfile.cheapScoreMs}ms, ` +
          `scoreFit=${dqProfile.scoreFitMs}ms`,
      );
    }
    if (match) {
      matchedScore = match.score;
      matchedRefCount = refGrid.length;
      matchedGrid = refGrid.map(p => applyAffine(match.transform, p));
      // Sample grayscale brightness at each matched-grid centre so
      // the report can display it next to each yellow ring — makes
      // "why wasn't this hole detected?" trivially answerable
      // (compare vs. the paper-midpoint threshold shown in the
      // registration block).
      matchedGridBrightness = matchedGrid.map(p => {
        const xi = Math.round(p.x);
        const yi = Math.round(p.y);
        if (xi < 0 || yi < 0 || xi >= img.width || yi >= img.height) {
          return 0;
        }
        return img.pixels[yi * img.width + xi];
      });
      // How much is the winning transform translation-shifted from
      // "chart centred in guide"? Compare centroids only — the
      // matched-grid centroid should land at the position the refGrid
      // centroid would land at if the chip rectangle filled the
      // guide proportionally. Doesn't try to catch scale errors
      // (chart margin vs guide margin varies fixture-to-fixture),
      // just translation. A one-column shift shows as ≈ 1.0;
      // well-placed charts stay under ~0.3.
      if (guideRect) {
        const FULL_MAX_X = 10;
        const FULL_MAX_Y = 15;
        const idealColSpacing = (2 * guideRect.w) / FULL_MAX_X;
        const idealRowSpacing = (3 * guideRect.h) / FULL_MAX_Y;
        let refSumX = 0;
        let refSumY = 0;
        let matchedSumX = 0;
        let matchedSumY = 0;
        for (let i = 0; i < refGrid.length; i++) {
          refSumX += refGrid[i].x;
          refSumY += refGrid[i].y;
          matchedSumX += matchedGrid[i].x;
          matchedSumY += matchedGrid[i].y;
        }
        const refCentroidX = refSumX / refGrid.length;
        const refCentroidY = refSumY / refGrid.length;
        const idealCentroidX =
          guideRect.x + (refCentroidX * guideRect.w) / FULL_MAX_X;
        const idealCentroidY =
          guideRect.y + (refCentroidY * guideRect.h) / FULL_MAX_Y;
        const matchedCentroidX = matchedSumX / matchedGrid.length;
        const matchedCentroidY = matchedSumY / matchedGrid.length;
        const shiftX = Math.abs(matchedCentroidX - idealCentroidX);
        const shiftY = Math.abs(matchedCentroidY - idealCentroidY);
        maxHOffsetFrac = idealColSpacing > 0 ? shiftX / idealColSpacing : null;
        maxVOffsetFrac = idealRowSpacing > 0 ? shiftY / idealRowSpacing : null;
      }
      // Compute which ref points were inliers under the winning
      // transform — mirrors scoreTransform's greedy unique-assignment
      // logic so the display matches what scored. A ref point is an
      // inlier if its nearest unclaimed detected point is within
      // matchThreshold; that detected index is then marked claimed
      // so two ref points can't share the same detected match.
      const t2 = matchThreshold * matchThreshold;
      const claimed = new Array(detectedPoints.length).fill(false);
      matchedGridInliers = matchedGrid.map(({x: ex, y: ey}) => {
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
          return true;
        }
        return false;
      });
      matchedTripletDetected = match.detectedTriplet.map(p => ({
        x: p.x,
        y: p.y,
      }));
      // Sample rects: transform each SAMPLE_GRID point into pixel
      // space, expand to a square. Half-side = 0.25 × min(col-step,
      // row-step) in pixels — a square that comfortably fits inside
      // one swatch/hole area without overlapping neighbours.
      const colStepPx = Math.hypot(
        match.transform.a * 2,
        match.transform.d * 2,
      );
      const rowStepPx = Math.hypot(
        match.transform.b * 3,
        match.transform.e * 3,
      );
      // Expose to callers so downstream sample-rect sizing uses the
      // RANSAC affine's own scale (matches where the yellow rings +
      // matched sample-rect centres land) rather than the cluster
      // fit's cellW/cellH, which can be off by 2× on the sparse pages
      // where cluster misidentifies row spacing.
      matchedColStepPx = colStepPx;
      matchedRowStepPx = rowStepPx;
      // Half-side = 0.1875 × min(colStepPx, rowStepPx) — 25% smaller
      // than the previous 0.25 so the ROI stays comfortably inside a
      // swatch even when the fit has slight residual drift near the
      // chart edges.
      const halfSide = 0.1875 * Math.min(colStepPx, rowStepPx);
      matchedSampleRects = sampleGrid.map(p => {
        const c = applyAffine(match.transform, p);
        return {
          x: c.x - halfSide,
          y: c.y - halfSide,
          w: halfSide * 2,
          h: halfSide * 2,
        };
      });
    }
  }

  return {
    centers,
    cellW,
    cellH,
    detected,
    rawBlobs,
    chartBodyBounds: null,
    // Repurposed for this detector: shows the caller-provided mask so
    // the debug overlay's "flat" toggle can visualise which pixels the
    // detector considered candidates. With whiteMask feeding in: paper
    // + all hole interiors should be bright (1); chart body + colored
    // chips should be dark (0).
    brightMaskSpans: maskToSpans(mask, 4),
    chartBodyMaskSpans: [],
    matchedGrid,
    matchedGridInliers,
    matchedColStepPx,
    matchedRowStepPx,
    matchedScore,
    matchedRefCount,
    matchedTripletDetected,
    matchedSampleRects,
    matchedGridBrightness,
    avgLuma,
    paperLuma,
    // Populated by chartAnalysis.ts after this function returns, from
    // whiteMask.borderMedianR/G/B — we don't have the mask result in
    // scope here, so the caller patches these in.
    paperMedianR: null,
    paperMedianG: null,
    paperMedianB: null,
    brightPaperOnDark:
      paperLuma === null ? null : paperLuma > avgLuma ? true : false,
    nKept: statusCounts.kept ?? 0,
    rejectCounts: {
      area_low: statusCounts.reject_area_low ?? 0,
      area_high: statusCounts.reject_area_high ?? 0,
      touches_edge: statusCounts.reject_touches_edge ?? 0,
      outside_guide: statusCounts.reject_outside_guide ?? 0,
    },
    maxHOffsetFrac,
    maxVOffsetFrac,
  };
};

// Classifier now decides "is this centre pixel PAPER?" via a
// midpoint threshold between two known landmarks:
//   - paperLuma: what the whitemask border-ring calibration says
//     paper looks like TODAY (per-capture).
//   - avgLuma: average brightness of the whole preview.
//
// If paperLuma > avgLuma → paper is brighter than surroundings
// (e.g. chart on a dark background, or a normally-lit chart). Keep
// centres > (paperLuma + avgLuma) / 2.
//
// If paperLuma < avgLuma → paper is dimmer than surroundings (rare
// — e.g. shooting a dark chart card on white paper). Keep centres <
// (paperLuma + avgLuma) / 2.
//
// If neither anchor is available (fallback path), use the historical
// absolute cutoff (170) that was tuned against well-lit captures.
//
// This replaces the old dual isDark / isBright band with an
// adaptive cutoff, and also collapses `kept_bright` / `kept_dark`
// into a single `kept` status — the pipeline only ever needs one
// polarity per capture, so tracking both was noise.
// Note: the isPaperCentre midpoint check used to be an extra
// classifier gate here. On WHITE-page bright-bg captures it dropped
// legitimate chip holes whose paper reveal happens to sit just below
// the (paperLuma+avgLuma)/2 midpoint (centres at ~170-178, midpoint
// ~180, all rejected as reject_brightness even though the mask had
// already qualified those pixels as paper). The mask is a more
// nuanced gate — if a pixel passed the border-cal per-channel + chroma
// spread test, trust it. Direction detection is still logged for
// diagnostics but no longer acts here.
const classifyRegion = (
  r: Region,
  img: GrayImage,
  minArea: number,
  maxArea: number,
  guideRect: {x: number; y: number; w: number; h: number} | null,
): DebugBlob['status'] => {
  if (r.area < minArea) return 'reject_area_low';
  if (r.area > maxArea) return 'reject_area_high';
  if (
    r.minX === 0 ||
    r.minY === 0 ||
    r.maxX === img.width - 1 ||
    r.maxY === img.height - 1
  ) {
    return 'reject_touches_edge';
  }
  if (
    guideRect &&
    (r.cx < guideRect.x ||
      r.cx > guideRect.x + guideRect.w ||
      r.cy < guideRect.y ||
      r.cy > guideRect.y + guideRect.h)
  ) {
    return 'reject_outside_guide';
  }
  return 'kept';
};

// Fallback bright cutoff when whitemask calibration didn't supply a
// Mean pixel value across the whole grayscale image. Cheap one-pass
// sum for the per-capture "average brightness" — used only for the
// direction diagnostic + report banner now that isPaperCentre is
// gone; kept because analysis tooling / regression reports expect it.
const meanLuma = (img: GrayImage): number => {
  const {pixels} = img;
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) sum += pixels[i];
  return sum / pixels.length;
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

// Drop endpoint entries from a sorted array whose gap to their
// neighbour is much larger than the adjacent inner gap. Used on the
// row / col cluster centres to strip clusters that came from noise
// blobs sitting outside the chart (Post-Its above, paper edge to the
// side) before those get assigned to real template positions.
//
// Compares each endpoint gap to its own IMMEDIATE inner neighbour,
// not the global median — a global median would be inflated by the
// very outlier we're trying to detect, hiding it. Only prunes if the
// ratio exceeds MAX_GAP_RATIO (1.7 = a legit "row missed" 2× gap
// stays; a 3× "phantom row above chart" gap doesn't).
//
// Repeats until neither endpoint looks bad or fewer than 3 entries
// remain — with only 2 entries there's no inner gap to compare to.
const pruneEndpointOutliers = (sorted: readonly number[]): number[] => {
  const MAX_GAP_RATIO = 1.7;
  let cur = [...sorted];
  while (cur.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < cur.length; i++) gaps.push(cur[i] - cur[i - 1]);
    const first = gaps[0];
    const last = gaps[gaps.length - 1];
    const secondFirst = gaps[1] ?? first;
    const secondLast = gaps[gaps.length - 2] ?? last;
    const firstBad = first > secondFirst * MAX_GAP_RATIO;
    const lastBad = last > secondLast * MAX_GAP_RATIO;
    if (!firstBad && !lastBad) break;
    // If both endpoints look bad, drop the proportionally worse one
    // first and re-evaluate. Handles the (rare) case of noise on
    // both sides of the chart.
    const dropFirst =
      firstBad && (!lastBad || first / secondFirst >= last / secondLast);
    cur = dropFirst ? cur.slice(1) : cur.slice(0, -1);
  }
  return cur;
};

// Trim a sorted cluster-info list (each entry: center + member count)
// down to at most `maxN` entries, dropping the ones with the fewest
// members. Catches spurious clusters that gap-based pruning misses —
// e.g. the small binder holes on the chart's left margin form a
// column at chart-column spacing but with far fewer members than
// real chroma columns.
const trimToTemplateCount = <T extends {center: number; count: number}>(
  info: readonly T[],
  maxN: number,
): T[] => {
  if (info.length <= maxN) return [...info];
  return [...info]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxN)
    .sort((a, b) => a.center - b.center);
};

// Expected grayscale (0-255, sRGB-encoded) for every template cell,
// derived from MUNSELL_10YR_CELLS.expectedLinearRgb. Used by
// scoreFit to grade a candidate affine — the fit that lands
// closest to the expected brightness pattern is the right one.
const EXPECTED_GRAY: number[][] = (() => {
  const out: number[][] = [];
  for (let r = 0; r < CHART_VALUES.length; r++) {
    const row: number[] = [];
    for (let c = 0; c < CHART_CHROMAS.length; c++) {
      const notation = `${CHART_HUE} ${CHART_VALUES[r]}/${CHART_CHROMAS[c]}`;
      const cell = MUNSELL_10YR_CELLS.find(x => x.notation === notation);
      if (!cell) {
        row.push(-1);
        continue;
      }
      const {r: rr, g, b} = cell.expectedLinearRgb;
      const lin = 0.2126 * rr + 0.7152 * g + 0.0722 * b;
      const srgb =
        lin <= 0.0031308 ? 12.92 * lin : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
      row.push(Math.round(Math.max(0, Math.min(1, srgb)) * 255));
    }
    out.push(row);
  }
  return out;
})();

// Score a candidate affine by mean absolute brightness difference
// between the extrapolated cell centres and the expected template
// brightness. Lower = better. Off-image cells count as a heavy
// penalty (a wrong offset that pushes rows off the frame scores
// much worse than one that keeps them all in-frame).
const scoreFit = (
  xCoeffs: readonly [number, number, number],
  yCoeffs: readonly [number, number, number],
  img: GrayImage,
  swatchOffsetInRowSteps: number,
): number => {
  const offsetX = xCoeffs[1] * swatchOffsetInRowSteps;
  const offsetY = yCoeffs[1] * swatchOffsetInRowSteps;
  let total = 0;
  let n = 0;
  for (let r = 0; r < CHART_VALUES.length; r++) {
    for (let c = 0; c < CHART_CHROMAS.length; c++) {
      const expected = EXPECTED_GRAY[r][c];
      if (expected < 0) continue;
      const cx = Math.round(
        xCoeffs[0] * c + xCoeffs[1] * r + xCoeffs[2] + offsetX,
      );
      const cy = Math.round(
        yCoeffs[0] * c + yCoeffs[1] * r + yCoeffs[2] + offsetY,
      );
      if (cx < 0 || cy < 0 || cx >= img.width || cy >= img.height) {
        total += 128;
      } else {
        total += Math.abs(img.pixels[cy * img.width + cx] - expected);
      }
      n++;
    }
  }
  return n > 0 ? total / n : Infinity;
};

// Enumerate every subset of {0..N-1} of size `k`, in lexicographic
// order (each returned subset is sorted ascending). Used to try all
// possible ways of dropping (N - k) detected clusters when we have
// more clusters than template positions.
const enumerateSubsets = (N: number, k: number): number[][] => {
  if (k > N) return [];
  if (k === N) return [Array.from({length: N}, (_, i) => i)];
  const out: number[][] = [];
  const rec = (start: number, chosen: number[]) => {
    if (chosen.length === k) {
      out.push([...chosen]);
      return;
    }
    const remaining = k - chosen.length;
    for (let i = start; i <= N - remaining; i++) {
      chosen.push(i);
      rec(i + 1, chosen);
      chosen.pop();
    }
  };
  rec(0, []);
  return out;
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
