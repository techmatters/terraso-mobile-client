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
  bandpass,
  blobAspect,
  blobFillRatio,
  blobH,
  blobW,
  connectedComponents,
  dilate1,
  erode1,
  findFlatCircles,
  findFlatRectangles,
  localFlatMask,
  maskToSpans,
  regionGrow,
  threshold,
  type Blob,
  type GrayImage,
  type Region,
} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';
import {
  applyAffine,
  createRandomTripletIterator,
  findBestTransform,
  REFERENCE_GRID,
  SAMPLE_GRID,
  type Point,
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
  status:
    | 'kept'
    | 'kept_dark'
    | 'kept_bright'
    | 'reject_area_low'
    | 'reject_area_high'
    | 'reject_aspect'
    | 'reject_fill'
    | 'reject_mindim'
    | 'reject_touches_edge'
    | 'reject_brightness'
    | 'reject_low_contrast';
};

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
  // Score for the winning transform (continuous score from
  // scoreTransform). Shown in the debug legend.
  matchedScore: number | null;
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
  //
  //    Morphological OPEN (erode → dilate) after threshold breaks the
  //    thin bridges that would otherwise merge adjacent dark swatches
  //    into one mega-blob — especially at rows 2/-4/ where the
  //    swatches are near-black and the mid-grey chart body between
  //    them is still below the DARK_THRESHOLD cutoff. Opening
  //    disconnects those 1-pixel bridges without shrinking the
  //    surviving blobs, so downstream cell-size estimates stay
  //    honest.
  const rawMask = threshold(img, DARK_THRESHOLD, /*invert*/ true);
  const mask = dilate1(erode1(rawMask));
  const blobs = connectedComponents(mask);

  // 2. Filter for swatch-shaped blobs. Tag each blob with the reason
  //    it was kept / rejected so the debug overlay can colour-code
  //    them — invaluable when the fit is off and we need to see
  //    whether the detector missed real swatches or hallucinated
  //    junk.
  const totalPixels = img.width * img.height;
  const minArea = Math.max(50, MIN_AREA_FRAC * totalPixels);
  const maxArea = MAX_AREA_FRAC * totalPixels;
  const tagged = blobs.map(b => ({
    blob: b,
    status: classifyBlob(b, minArea, maxArea),
  }));
  const candidates = tagged.filter(t => t.status === 'kept').map(t => t.blob);
  const rawBlobs: DebugBlob[] = tagged
    .filter(t => t.blob.area >= DEBUG_MIN_BLOB_AREA)
    .map(t => ({
      minX: t.blob.minX,
      minY: t.blob.minY,
      maxX: t.blob.maxX,
      maxY: t.blob.maxY,
      cx: t.blob.cx,
      cy: t.blob.cy,
      area: t.blob.area,
      status: t.status,
    }));
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
  //    them to template indices deterministically. Then prune any
  //    endpoint cluster whose gap to its neighbour is much larger
  //    than adjacent inner gaps — that's how a Post-It above the
  //    chart or noise blobs to the side of it show up. Without this
  //    prune those phantom clusters get assigned to a real template
  //    row/col and shift the whole affine off the chart. Inner gaps
  //    aren't pruned: a legitimately-undetected row (e.g. value 8
  //    swatches too light to survive the dark-threshold) shows up
  //    as an inner 2× gap and needs to survive so the surrounding
  //    rows still map to their correct template positions.
  const rowClusterCenters = pruneEndpointOutliers(
    rowClusters.map(r => median(r.map(b => b.cy))).sort((a, b) => a - b),
  );
  const colClusterCenters = pruneEndpointOutliers(
    colClusters.map(c => median(c.map(b => b.cx))).sort((a, b) => a - b),
  );
  if (rowClusterCenters.length < 2 || colClusterCenters.length < 2) return null;

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

  return {
    centers,
    cellW,
    cellH,
    detected,
    rawBlobs,
    chartBodyBounds: null,
    brightMaskSpans: [],
    chartBodyMaskSpans: [],
    matchedGrid: null,
    matchedScore: null,
    matchedTripletDetected: null,
    matchedSampleRects: null,
  };
};

// Same shape gates as the inline filter above, but returns WHY the
// blob was rejected instead of a boolean. Kept in one place so the
// filter and the debug labelling can't drift apart.
const classifyBlob = (
  b: Blob,
  minArea: number,
  maxArea: number,
): DebugBlob['status'] => {
  if (b.area < minArea) return 'reject_area_low';
  if (b.area > maxArea) return 'reject_area_high';
  if (blobAspect(b) > MAX_ASPECT) return 'reject_aspect';
  if (blobFillRatio(b) < MIN_FILL_RATIO) return 'reject_fill';
  if (Math.min(blobW(b), blobH(b)) < 8) return 'reject_mindim';
  return 'kept';
};

// -----------------------------------------------------------------
// Alternative anchor: register on the chart's WHITE HOLES rather
// than the dark swatches. The holes are cutouts through the card, so
// their appearance is much more consistent than the swatches (which
// merge into mega-blobs at low values, or vanish entirely at high
// values). On a chart photographed against white paper the holes
// read as bright ovals surrounded by mid-grey chart body — a strong
// signal that doesn't depend on Munsell value.
//
// This won't work when the chart is photographed on a black card
// (holes show BLACK, not white) — in that case detectChartByGrid is
// still the right choice. The caller picks the anchor that fits
// the setup.

// Middle ground: 200 is generous enough to catch hole interiors on
// captures that aren't perfectly lit, at the cost of also picking
// up value-8 near-white swatches (which are grid-aligned anyway).
// Bumping this higher (220+) was too aggressive on the test chart —
// killed the hole detection entirely.
const BRIGHT_THRESHOLD = 200;
// Holes are oval — a perfect ellipse fills π/4 ≈ 0.785 of its
// bounding box. Threshold + 1-px open shrinks the ovals a bit; set
// the floor low enough to keep them, high enough to reject
// ring/text shapes.
const MIN_HOLE_FILL_RATIO = 0.55;
// Holes are close to 1:1 or up to ~1.7× longer than wide (depends on
// which chart edition). Allow either orientation.
const MAX_HOLE_ASPECT = 2.2;
const MIN_HOLE_AREA_FRAC = 0.0008;
const MAX_HOLE_AREA_FRAC = 0.015;
// The affine anchors on HOLE centres, but the caller wants SWATCH
// centres (that's what it samples). On the 10YR soil chart each
// swatch sits directly above its hole by roughly half a row-step;
// shift the fitted centres by this fraction of the row-step vector.
// Tune per chart if the swatch/hole layout differs.
const SWATCH_OFFSET_IN_ROW_STEPS = -0.5;

export const detectChartByHoles = (img: GrayImage): GridDetection | null => {
  // 0. Locate the chart body first. This is what lets us restrict
  //    hole detection to inside the card — without it, the bright
  //    paper background outside the chart merges with hole
  //    interiors through the thin chart edges and eats the bottom
  //    rows entirely (paper + rows 2/-4/ holes collapse into one
  //    reject_area_high mega-blob).
  const chartBodyMask = bandpass(img, CHART_BODY_LOW, CHART_BODY_HIGH);
  const chartBodyBounds = boundsOfLargestBlob(
    chartBodyMask,
    MIN_CHART_BODY_AREA_FRAC * img.width * img.height,
  );

  // 1. Isolate BRIGHT regions, then zero out anything outside the
  //    chart body bounds so paper is physically separated from
  //    hole interiors before connected-components runs. Falls back
  //    to a full-image mask if chart body detection failed — better
  //    to try than to refuse to detect anything at all.
  const rawMask = threshold(img, BRIGHT_THRESHOLD, /*invert*/ false);
  if (chartBodyBounds) restrictMaskToBounds(rawMask, chartBodyBounds);
  const mask = dilate1(erode1(rawMask));
  const blobs = connectedComponents(mask);

  // Diagnostic snapshots — sample both masks so the debug overlay
  // can visualise what CC actually saw and what the chart body
  // detector produced. Sampled with rowStride=4 to keep the SVG
  // span count in the low thousands.
  const brightMaskSpans = maskToSpans(mask, 4);
  const chartBodyMaskSpans = maskToSpans(chartBodyMask, 4);

  // 2. Filter for hole-shaped blobs, tagging the rejection reason
  //    for the debug overlay. The touches-edge check rejects the
  //    paper background — the biggest bright region in almost every
  //    "chart on white paper" capture is the paper itself, which
  //    connects to the frame edge on at least one side.
  const totalPixels = img.width * img.height;
  const minArea = Math.max(50, MIN_HOLE_AREA_FRAC * totalPixels);
  const maxArea = MAX_HOLE_AREA_FRAC * totalPixels;
  const tagged = blobs.map(b => ({
    blob: b,
    status: classifyHoleBlob(b, img, minArea, maxArea),
  }));
  const candidates = tagged.filter(t => t.status === 'kept').map(t => t.blob);
  const rawBlobs: DebugBlob[] = tagged
    .filter(t => t.blob.area >= DEBUG_MIN_BLOB_AREA)
    .map(t => ({
      minX: t.blob.minX,
      minY: t.blob.minY,
      maxX: t.blob.maxX,
      maxY: t.blob.maxY,
      cx: t.blob.cx,
      cy: t.blob.cy,
      area: t.blob.area,
      status: t.status,
    }));
  if (candidates.length < 6) return null;

  // 3-6: cluster, prune outliers, assign, fit — same shape as
  //      detectChartByGrid.
  const medianH = median(candidates.map(b => blobH(b)));
  const medianW = median(candidates.map(b => blobW(b)));
  const rowClusters = clusterByAxis(candidates, b => b.cy, medianH * 0.6);
  const colClusters = clusterByAxis(candidates, b => b.cx, medianW * 0.6);
  if (rowClusters.length < 2 || colClusters.length < 2) return null;

  const rowClusterCenters = pruneEndpointOutliers(
    rowClusters.map(r => median(r.map(b => b.cy))).sort((a, b) => a - b),
  );
  const colClusterCenters = pruneEndpointOutliers(
    colClusters.map(c => median(c.map(b => b.cx))).sort((a, b) => a - b),
  );
  if (rowClusterCenters.length < 2 || colClusterCenters.length < 2) return null;

  // Row-offset heuristic — HOLES: the failure mode is bottom-row
  // holes getting absorbed into the paper background (chart bottom
  // sits closer to the frame edge in most captures, so the chart-
  // body edge is thinner there and the paper leaks through). So a
  // partial hole-row detection almost always means "detected the
  // TOP N rows, missing the bottom ones" — the opposite of the
  // dark-swatch case. Keep colOffset = 0 (same rationale: leftmost
  // chromas rarely go missing).
  const rowOffset = 0;
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
    .filter(e => {
      const cx = colClusterCenters[e.colIdx - colOffset];
      const cy = rowClusterCenters[e.rowIdx - rowOffset];
      const dx = Math.abs(e.cx - cx);
      const dy = Math.abs(e.cy - cy);
      return dx < medianW && dy < medianH;
    });
  if (detected.length < 6) return null;

  const xCoeffs = leastSquares3(detected.map(d => [d.colIdx, d.rowIdx, d.cx]));
  const yCoeffs = leastSquares3(detected.map(d => [d.colIdx, d.rowIdx, d.cy]));
  if (!xCoeffs || !yCoeffs) return null;

  // 7. Materialise the full grid, applying the swatch offset. The
  //    fitted affine gives HOLE centres; the caller wants SWATCH
  //    centres, which sit above their holes by half a row-step.
  //    Row-step vector is (xCoeffs[1], yCoeffs[1]) — encoding
  //    rotation and any shear, so shifting along it stays correct
  //    even on tilted captures.
  const offsetX = xCoeffs[1] * SWATCH_OFFSET_IN_ROW_STEPS;
  const offsetY = yCoeffs[1] * SWATCH_OFFSET_IN_ROW_STEPS;
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

  return {
    centers,
    cellW,
    cellH,
    detected,
    rawBlobs,
    chartBodyBounds,
    brightMaskSpans,
    chartBodyMaskSpans,
    matchedGrid: null,
    matchedScore: null,
    matchedTripletDetected: null,
    matchedSampleRects: null,
  };
};

const classifyHoleBlob = (
  b: Blob,
  img: GrayImage,
  minArea: number,
  maxArea: number,
): DebugBlob['status'] => {
  if (b.area < minArea) return 'reject_area_low';
  if (b.area > maxArea) return 'reject_area_high';
  if (blobAspect(b) > MAX_HOLE_ASPECT) return 'reject_aspect';
  if (blobFillRatio(b) < MIN_HOLE_FILL_RATIO) return 'reject_fill';
  if (
    b.minX === 0 ||
    b.minY === 0 ||
    b.maxX === img.width - 1 ||
    b.maxY === img.height - 1
  ) {
    return 'reject_touches_edge';
  }
  if (Math.min(blobW(b), blobH(b)) < 8) return 'reject_mindim';
  return 'kept';
};

// -----------------------------------------------------------------
// Alternative anchor: REGION GROWING. Instead of thresholding to
// bright OR dark, grow uniform-brightness regions from every
// unvisited pixel with a per-seed tolerance. Each chart feature —
// dark swatch, bright hole, chart body, paper background — surfaces
// as its own region, distinguished by mean brightness and size.
// Skips the paper-vs-hole merger problem entirely: paper is one
// large region rejected as too big; each hole is a separate
// moderate-sized bright region. Combines dark and bright candidates
// as a single set of grid anchors (both align to the same 7×6
// lattice, just offset by half a row), giving the affine fit ~2× the
// data of a single-polarity detector.

// Tolerance for the region-growing seed comparison (unused since
// switching to localFlatMask, kept for the fallback path).
const REGION_TOLERANCE = 25;
// Local-flatness window half-width (radius 2 = 5×5 window). Small
// enough to fit inside a swatch or hole interior (~30 pixels wide),
// large enough to trigger at any boundary between two different
// colours.
const FLAT_RADIUS = 2;
// Max spread (max-min brightness) inside the 5×5 window for the
// window's centre pixel to count as "flat". 15 survives JPEG blur
// and mild lighting gradients while still rejecting any pixel near
// a real colour transition.
const FLAT_TOLERANCE = 15;
// A region qualifies as a "dark swatch candidate" if its mean is
// below this cutoff, or a "bright hole candidate" if above the
// bright cutoff. Neither → rejected as neutral (chart body,
// mid-value swatches).
const DARK_REGION_MAX_MEAN = 100;
// 170 (not 190) — bright holes read as low as ~170-185 in
// under-exposed captures. The neutral-band cutoff (DARK_REGION_MAX
// = 100) still keeps the chart body out of the anchor set: chart
// body sits around 130-160 which falls between DARK_REGION_MAX
// and BRIGHT_REGION_MIN and gets rejected as reject_brightness.
const BRIGHT_REGION_MIN_MEAN = 170;
// Area range for a swatch / hole in a ~1200-wide preview. Lower
// bound (~radius 20 px) rejects binder holes and text; the actual
// discrimination between real anchors and paper fragmentation
// islands is done by surroundingContrast, so this floor doesn't
// need to be aggressive. Upper bound catches chart-body / paper as
// reject_area_high before they reach the classifier.
const MIN_REGION_AREA_FRAC = 0.001;
const MAX_REGION_AREA_FRAC = 0.02;
const MAX_REGION_ASPECT = 2.2;
// Fill ratio floors — dark swatches are near-rectangular so require
// a densely-filled bounding box; bright holes are oval so allow a
// looser fill.
const MIN_DARK_FILL_RATIO = 0.75;
const MIN_BRIGHT_FILL_RATIO = 0.55;
// Minimum mean-absolute contrast between the candidate's centre and
// 8 sample points just outside its bounding radius. Real chart
// features (holes on grey chart body, dark swatches on grey chart
// body) have contrast of 80-100+. Uniform paper "circles" produced
// by localFlat fragmentation of paper have near-zero contrast
// because their "surroundings" are more paper. 30 is a comfortable
// floor — well above the fragmentation-noise regime, well below
// real features.
const MIN_SURROUND_CONTRAST = 30;

export const detectChartByRegions = (img: GrayImage): GridDetection | null => {
  // 1. Local-flatness mask: for every pixel, check whether a 5×5
  //    window centred on it is uniform (max-min < FLAT_TOLERANCE).
  //    Uniform interiors of swatches, holes, and chart body come
  //    out as 1-regions; boundaries between different-colour
  //    regions are always 0 (window straddles the boundary). This
  //    gives cleaner separation than seed-based region growing —
  //    no risk of gradient drift merging adjacent regions.
  const flatMask = localFlatMask(img, FLAT_RADIUS, FLAT_TOLERANCE);

  // 2. Find inscribed circles in the flat mask. Distance transform
  //    gives, at every 1-pixel, the max radius circle that fits
  //    inside a 1-region centred there. Take the local maxima with
  //    radius in [minRadius, maxRadius] and greedy-keep largest-
  //    first, dropping any candidate that overlaps a kept circle.
  //    Circles beat rectangles as the primitive: swatch and hole
  //    interiors both inscribe cleanly, and the "no overlap" rule
  //    naturally produces one detection per feature.
  const totalPixels = img.width * img.height;
  const minArea = Math.max(50, MIN_REGION_AREA_FRAC * totalPixels);
  const maxArea = MAX_REGION_AREA_FRAC * totalPixels;
  const minRadius = Math.sqrt(minArea / Math.PI);
  const maxRadius = Math.sqrt(maxArea / Math.PI);
  const circles = findFlatCircles(flatMask, minRadius, maxRadius);

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

  // 3. Classify and filter. Dark rectangles and bright ovals both
  //    survive; chart body and paper are rejected as too-large.
  const tagged = regions.map(r => ({
    region: r,
    status: classifyRegion(r, img, minArea, maxArea),
  }));
  // Pick whichever anchor type has more detections. Dark-only
  // gives the cleanest fit (bottom-N heuristic is provably right,
  // no swatch/hole offset needed), but often only 2-3 rows detect
  // as truly dark on a well-exposed chart. Extrapolating a full
  // 7-row grid from 2 anchor rows amplifies any fit error over
  // the 5 extrapolated rows — that's what causes the "top rows
  // drift high" symptom. Bright holes usually detect across all
  // 6-7 rows, so switching to them when they dominate gives a
  // much more stable fit; the -0.5 row-step swatch offset applied
  // downstream converts hole centres back to swatch centres.
  const darkCandidates = tagged
    .filter(t => t.status === 'kept_dark')
    .map(t => t.region);
  const brightCandidates = tagged
    .filter(t => t.status === 'kept_bright')
    .map(t => t.region);
  const useBrightAnchors = brightCandidates.length > darkCandidates.length;
  const candidates = useBrightAnchors ? brightCandidates : darkCandidates;
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
  if (candidates.length < 6) return null;

  // 3. Cluster surviving candidates by y (rows) and x (cols). Dark
  //    swatches and bright holes sit on the same grid columns; they
  //    differ by ~half a cell in y, so they may form 2× the row
  //    clusters expected. The endpoint prune below handles that.
  const medianH = median(candidates.map(b => blobH(b)));
  const medianW = median(candidates.map(b => blobW(b)));
  const rowClusters = clusterByAxis(candidates, b => b.cy, medianH * 0.6);
  const colClusters = clusterByAxis(candidates, b => b.cx, medianW * 0.6);
  if (rowClusters.length < 2 || colClusters.length < 2) return null;

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
  if (rowClusterCenters.length < 2 || colClusterCenters.length < 2) return null;

  // 3. Brightness-match search. For every viable combination of
  //    (rowSubset, colSubset, rowOffset, colOffset), fit the affine
  //    and score against the expected 10YR-chart brightness pattern.
  //    Winner is the assignment whose extrapolated cell centres land
  //    closest to the pixel values the template predicts — much
  //    stronger evidence than "cluster with the most members"
  //    because it uses the whole chart's darker-lower / lighter-
  //    higher-value pattern to disambiguate.
  const swatchOffsetInRowSteps = useBrightAnchors ? -0.5 : 0;
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
  if (!bestXCoeffs || !bestYCoeffs || !bestDetected) return null;
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
  // that affine to REFERENCE_GRID to get 36 predicted grid points
  // for rendering as yellow dots.
  //
  // Match threshold = cellH * 0.4 — roughly one hole-radius, so a
  // ref point counts as matched if it lands anywhere near a real
  // detected circle. Early exit at 30/36 matches (near-perfect) so
  // typical clean captures return quickly instead of grinding
  // through the full C(N,3)² sweep.
  const brightRegions = tagged
    .filter(t => t.status === 'kept_bright')
    .map(t => t.region);
  const detectedPoints: Point[] = brightRegions.map(r => ({
    x: r.cx,
    y: r.cy,
  }));
  let matchedGrid: {x: number; y: number}[] | null = null;
  let matchedScore: number | null = null;
  let matchedTripletDetected: {x: number; y: number}[] | null = null;
  let matchedSampleRects:
    | {x: number; y: number; w: number; h: number}[]
    | null = null;
  if (detectedPoints.length >= 3) {
    // Tightened from 0.4 to 0.2 of cellH — 0.4 was roughly half a
    // row-step which is bigger than one whole hole, so many wrong
    // transforms could still score high. 0.2 is roughly a hole
    // radius, so a ref-to-detected match requires the transformed
    // ref to land inside or very near a real detected hole.
    const matchThreshold = Math.max(10, cellH * 0.2);
    // Outer (ref) iterator: TEMPORARY 100 random triplets for
    // faster iteration during UX work. Real value should be ~1000+
    // to cover all filtered-in ref triplets (~800 pass distinct
    // rows/cols + non-collinear). Inner (detected) iterator:
    // exhaustive.
    const OUTER_TRIPLET_COUNT = 100;
    const refIterator = createRandomTripletIterator(OUTER_TRIPLET_COUNT);
    const tStart = Date.now();
    const match = findBestTransform(
      REFERENCE_GRID,
      detectedPoints,
      matchThreshold,
      undefined,
      undefined,
      refIterator,
    );
    const tElapsed = Date.now() - tStart;
    console.log(
      `[chart-match] ${detectedPoints.length} detected × ${OUTER_TRIPLET_COUNT} ref triplets in ${tElapsed}ms; score=${match?.score?.toFixed(2) ?? 'null'}`,
    );
    if (match) {
      matchedScore = match.score;
      matchedGrid = REFERENCE_GRID.map(p => applyAffine(match.transform, p));
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
      // Half-side = 0.1875 × min(colStepPx, rowStepPx) — 25% smaller
      // than the previous 0.25 so the ROI stays comfortably inside a
      // swatch even when the fit has slight residual drift near the
      // chart edges.
      const halfSide = 0.1875 * Math.min(colStepPx, rowStepPx);
      matchedSampleRects = SAMPLE_GRID.map(p => {
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
    // Repurposed for this detector: shows the localFlatMask so the
    // debug overlay's "flat" toggle can visualise which pixels the
    // detector considered "locally uniform." Boundary pixels between
    // different-colour regions should be dark (0) in the overlay;
    // swatch/hole/chart-body interiors should be bright (1).
    brightMaskSpans: maskToSpans(flatMask, 4),
    chartBodyMaskSpans: [],
    matchedGrid,
    matchedScore,
    matchedTripletDetected,
    matchedSampleRects,
  };
};

const classifyRegion = (
  r: Region,
  img: GrayImage,
  minArea: number,
  maxArea: number,
): DebugBlob['status'] => {
  if (r.area < minArea) return 'reject_area_low';
  if (r.area > maxArea) return 'reject_area_high';
  const isDark = r.meanBrightness < DARK_REGION_MAX_MEAN;
  const isBright = r.meanBrightness > BRIGHT_REGION_MIN_MEAN;
  if (!isDark && !isBright) return 'reject_brightness';
  if (blobAspect(r) > MAX_REGION_ASPECT) return 'reject_aspect';
  const minFill = isDark ? MIN_DARK_FILL_RATIO : MIN_BRIGHT_FILL_RATIO;
  if (blobFillRatio(r) < minFill) return 'reject_fill';
  if (
    r.minX === 0 ||
    r.minY === 0 ||
    r.maxX === img.width - 1 ||
    r.maxY === img.height - 1
  ) {
    return 'reject_touches_edge';
  }
  if (Math.min(blobW(r), blobH(r)) < 8) return 'reject_mindim';
  // Contrast-with-surroundings check. Filters out flat-mask
  // fragmentation islands on the paper background: their centre and
  // surrounding pixels are all the same paper brightness, so the
  // absolute difference is tiny. Real chart features sit against
  // chart body (~140 grey) which is far from either hole (~230) or
  // swatch (~40) brightness.
  const radius = Math.max((r.maxX - r.minX) / 2, (r.maxY - r.minY) / 2);
  if (surroundingContrast(img, r.cx, r.cy, radius) < MIN_SURROUND_CONTRAST) {
    return 'reject_low_contrast';
  }
  return isDark ? 'kept_dark' : 'kept_bright';
};

// Mean absolute difference between the centre pixel and 8 points
// sampled on a ring at 1.6× the candidate's radius. Off-image
// samples are skipped. Returns 0 if all samples were off-image.
const surroundingContrast = (
  img: GrayImage,
  cx: number,
  cy: number,
  radius: number,
): number => {
  const cxInt = Math.round(cx);
  const cyInt = Math.round(cy);
  if (cxInt < 0 || cyInt < 0 || cxInt >= img.width || cyInt >= img.height) {
    return 0;
  }
  const centreVal = img.pixels[cyInt * img.width + cxInt];
  const sampleR = radius * 1.6;
  let sumDiff = 0;
  let n = 0;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const sx = Math.round(cx + Math.cos(angle) * sampleR);
    const sy = Math.round(cy + Math.sin(angle) * sampleR);
    if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue;
    sumDiff += Math.abs(img.pixels[sy * img.width + sx] - centreVal);
    n++;
  }
  return n > 0 ? sumDiff / n : 0;
};

// Pick the template-index offset (row or col) that best places the
// full extrapolated grid inside the image bounds. For each candidate
// offset from 0 to (templateCount - detectedCount), reassigns the
// blobs to template indices, fits a 1D linear model along the target
// axis, extrapolates all templateCount positions, and counts how
// many land inside the image on that axis. Highest count wins;
// ties break to the lower offset.
const pickBestOffset = (
  candidates: readonly Region[],
  rowCenters: readonly number[],
  colCenters: readonly number[],
  templateCount: number,
  img: GrayImage,
  axis: 'row' | 'col',
): number => {
  const detectedCount = axis === 'row' ? rowCenters.length : colCenters.length;
  const missing = templateCount - detectedCount;
  if (missing <= 0) return 0;
  const limit = axis === 'row' ? img.height : img.width;
  let bestOffset = 0;
  let bestInFrame = -1;
  for (let candidate = 0; candidate <= missing; candidate++) {
    const samples: [number, number, number][] = candidates.map(b => {
      const rowIdxDet = nearestIndex(rowCenters, b.cy);
      const colIdxDet = nearestIndex(colCenters, b.cx);
      const rowIdx = axis === 'row' ? candidate + rowIdxDet : rowIdxDet;
      const colIdx = axis === 'col' ? candidate + colIdxDet : colIdxDet;
      return [colIdx, rowIdx, axis === 'row' ? b.cy : b.cx];
    });
    const coeffs = leastSquares3(samples);
    if (!coeffs) continue;
    let inFrame = 0;
    for (let r = 0; r < CHART_VALUES.length; r++) {
      for (let c = 0; c < CHART_CHROMAS.length; c++) {
        const v = coeffs[0] * c + coeffs[1] * r + coeffs[2];
        if (v >= 0 && v < limit) inFrame++;
      }
    }
    if (inFrame > bestInFrame) {
      bestInFrame = inFrame;
      bestOffset = candidate;
    }
  }
  return bestOffset;
};

// Rough bounding box of the chart card body (the grey card material)
// in the image. Used to restrict hole detection to inside the chart
// so bright paper pixels outside the chart don't merge with hole
// interiors through thin chart edges. Returns null if no
// plausibly-large medium-grey region is found — the caller then
// falls back to searching the full image.
// Chart body brightness range. Set to distinguish the grey card
// (~140) from the surrounding paper (~180-220) and from hole
// interiors (~220-250). Diagnostic overlay showed HIGH=200 was too
// permissive — indoor-lit paper reads as low as ~185 and fell inside
// the bandpass, so the "largest connected medium-grey blob" swept up
// the paper along with the chart and `chartBodyBounds` ended up
// covering nearly the whole frame. HIGH=170 cleanly separates chart
// card from paper for all the test captures we've looked at. LOW is
// small but nonzero to skip pure-black regions (shadows, cable
// outlines) and keep the mask focused on card material.
const CHART_BODY_LOW = 30;
const CHART_BODY_HIGH = 170;
// Chart body should occupy at least this fraction of the frame. If
// the largest medium-grey blob is smaller, we probably found
// something incidental (a shadow, a fabric backdrop, a Post-It
// edge) rather than the chart itself.
const MIN_CHART_BODY_AREA_FRAC = 0.1;

// Bounding box of the largest connected component in a mask, or null
// if the largest blob is smaller than `minArea` pixels (probably not
// what we're looking for).
const boundsOfLargestBlob = (
  mask: GrayImage,
  minArea: number,
): {minX: number; minY: number; maxX: number; maxY: number} | null => {
  const blobs = connectedComponents(mask);
  if (blobs.length === 0) return null;
  let biggest: Blob = blobs[0];
  for (const b of blobs) if (b.area > biggest.area) biggest = b;
  if (biggest.area < minArea) return null;
  return {
    minX: biggest.minX,
    minY: biggest.minY,
    maxX: biggest.maxX,
    maxY: biggest.maxY,
  };
};

// Zero out any mask pixels outside `bounds`. Mutates in place —
// avoids the allocation of a fresh Uint8Array for a mask that's
// only used within this function's next step.
const restrictMaskToBounds = (
  mask: GrayImage,
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
): void => {
  const {width, height, pixels} = mask;
  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    if (y < bounds.minY || y > bounds.maxY) {
      for (let x = 0; x < width; x++) pixels[rowStart + x] = 0;
    } else {
      for (let x = 0; x < bounds.minX; x++) pixels[rowStart + x] = 0;
      for (let x = bounds.maxX + 1; x < width; x++) pixels[rowStart + x] = 0;
    }
  }
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
