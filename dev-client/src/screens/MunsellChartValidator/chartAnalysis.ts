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

import DeltaE from 'delta-e';
import {DngDecoderHybrid} from 'dng-decoder';
import {labToMunsell, munsellToLab} from 'munsell';
// `munsell`'s index only re-exports a subset of its colorspace helpers.
// Deep-import the two we need — linear-sRGB → XYZ and XYZ → Lab —
// rather than re-implement them here.
import {linearRgbToXyz, xyzToLab} from 'munsell/dist/src/colorspace';

import {computeChartGuideRect} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {
  detectChartByRegions,
  type GridDetection,
  type GridEntry,
} from 'terraso-mobile-client/screens/MunsellChartValidator/gridRegistration';
import {
  maskToSpans,
  rec709Luma,
  rgbToGray,
  whiteMask,
  type RgbImage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';
import {
  DEFAULT_REGISTRATION_ALGORITHM,
  TEST_SWATCH_POINT,
  type RegistrationAlgorithm,
} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {CHART_HUE} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';
import {
  MUNSELL_PAGES,
  pageCells,
  pageReferenceGridPoints,
  pageSampleGridPoints,
  type MunsellPage,
  type MunsellPageCell,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

// End-to-end Munsell chart analysis: takes a captured DNG file,
// auto-registers the chart by finding its swatch grid, decodes every
// swatch via the RAW pipeline, and returns measured vs. expected per
// cell.
//
// Split into named steps so the UI can surface intermediate failures
// (couldn't find grid / couldn't decode / etc.) instead of dumping a
// stack trace on the user.

const PREVIEW_MAX_DIM = 1200;

// Fraction of a detected swatch cell to sample from the centre. The
// half-width means the FULL sample rect is 2× this fraction of a
// cell in each axis. Kept smallish so the rect stays clear of swatch
// edges even when the grid fit is a few pixels off.
const SAMPLE_HALF_W_FRAC = 0.17;
const SAMPLE_HALF_H_FRAC = 0.13;

// Raw per-cell measurement — the linear-sRGB the DNG decoder returned
// for the swatch, no WB correction applied. Kept separate from the
// display-ready MunsellCellResult below so the screen can re-apply a
// reference-cell WB correction on demand without re-decoding the DNG.
export type CellMeasurement = {
  cell: MunsellPageCell;
  rawLinearRgb: {r: number; g: number; b: number};
};

export type MunsellCellResult = {
  cell: MunsellPageCell;
  // The linear-sRGB actually used to compute measuredMunsell + deltaE.
  // Equals `rawLinearRgb` when no reference is active; otherwise
  // WB-corrected against the reference cell.
  measuredLinearRgb: {r: number; g: number; b: number};
  // Munsell notation the algorithm assigns to the (possibly corrected)
  // measured colour. Format matches munsellToRgb inputs, e.g. "10YR 5/4".
  measuredMunsell: string;
  // ΔE (CIE ΔE2000) between measured and expected colour, both
  // converted through the same Lab pipeline. 0 = perfect, ~1 = just
  // noticeable, > ~10 = clearly different.
  deltaE: number;
};

export type MunsellChartResult = {
  measurements: CellMeasurement[];
  // Grid geometry the detector found — includes per-detected-blob
  // entries the validation view uses to draw diagnostics.
  grid: GridDetection;
  // Preview PNG for the "did the auto-registration land on the right
  // pixels?" view. Rendered from the same DNG at the same maxDim so
  // the previewRects below index into its pixel space directly.
  preview: {uri: string; width: number; height: number};
  // Per-cell sampling rectangle in preview-space pixels. Same length
  // as `measurements`. Rendered as red-outlined overlays on top of the
  // preview so a tester can visually confirm each rect lands on the
  // correct swatch.
  previewRects: {x: number; y: number; w: number; h: number}[];
  // Detected swatch centroids, in preview-space pixels — drawn as
  // small green dots on the source view so the tester can see how
  // many swatches were actually detected vs. extrapolated.
  detectedSwatches: GridEntry[];
  // Raw linear-sRGB per position in the PER-PAGE sample grid (chips
  // the page populates + test-swatch appended last). Same ordering
  // and length as grid.matchedSampleRects. Null if the RANSAC match
  // step didn't run.
  matchedSampleValues: {r: number; g: number; b: number}[] | null;
  // Raw linear-sRGB at the always-empty TEST_SWATCH_POINT position —
  // used by the result view to compare a user-picked reference
  // (Post-It, gray card, etc.) against a real pixel sample. Null if
  // the RANSAC match step didn't run. This is just a convenience
  // alias for matchedSampleValues[last]; kept as its own field so
  // consumers don't need to hard-code the array's last index.
  testSwatchLinearRgb: {r: number; g: number; b: number} | null;
};

// Sensible default reference cell: 10YR 5/1 is a mid-value, low-chroma
// neutral — the most colour-agnostic of the swatches on the 10YR page,
// so best-suited to define "grey" for WB. Testers can tap any other
// cell in the result grid to override.
export const DEFAULT_REFERENCE_NOTATION = '10YR 5/1';

// Sentinel `notation` value the screen uses when the user taps the
// test-swatch cell to make it the WB reference for every other cell.
// computeCellResults looks up refs by notation; we inject a synthetic
// CellMeasurement carrying this notation whose expected/rawLinearRgb
// comes from the picked reference + the DNG sample at TEST_SWATCH_INDEX.
export const TEST_SWATCH_REFERENCE_NOTATION = '__test_swatch__';

// Everything analyzeMunsellChart managed to compute BEFORE the fatal
// failure. Rendered on the failure UI so a dev can inspect what the
// algorithm saw — the preview PNG, the white mask, and any raw circle
// candidates that got classified. `grid` is ALWAYS populated (even
// when detection returned null we synthesize a minimal GridDetection
// with just the mask spans so the debug overlay still renders).
export type MunsellChartFailureDebug = {
  reason: string;
  lumaAnchor: number | null;
  lumaCutoff: number | null;
  preview: {uri: string; width: number; height: number} | null;
  grid: GridDetection;
};

export type MunsellChartOutcome =
  | {kind: 'success'; result: MunsellChartResult}
  | {kind: 'failure'; debug: MunsellChartFailureDebug};

// 'raw' → route through CIRAWFilter (readPreviewRgb / decodeDngRois),
// 'photo' → route through CIImage (readPreviewRgbPhoto /
// decodePhotoRois). Everything downstream is identical — both paths
// return interleaved 3-byte-per-pixel sRGB previews and linear-sRGB
// ROIs. See the caveat in the photo variants' comments: photo pixels
// have already been WB-corrected + tone-curved by Apple's ISP.
export type ChartFormat = 'raw' | 'photo';

export const analyzeMunsellChart = async (
  imagePath: string,
  page: MunsellPage = MUNSELL_PAGES[0],
  format: ChartFormat = 'raw',
  algorithm: RegistrationAlgorithm = DEFAULT_REGISTRATION_ALGORITHM,
): Promise<MunsellChartOutcome> => {
  const cells = pageCells(page);
  // 1. RGB render for the CV. We need chromaticity (not just luma) to
  //    build a "paper white" mask that isolates each swatch hole as
  //    its own 1-region — off-white chart body has warm chroma and
  //    gets rejected by the chroma gate even though its luma is close
  //    to paper.
  const tBeforePreview = Date.now();
  const rgbPreview =
    format === 'raw'
      ? DngDecoderHybrid.readPreviewRgb(imagePath, PREVIEW_MAX_DIM)
      : DngDecoderHybrid.readPreviewRgbPhoto(imagePath, PREVIEW_MAX_DIM);
  const rgbImage: RgbImage = {
    width: rgbPreview.width,
    height: rgbPreview.height,
    pixels: new Uint8Array(rgbPreview.pixels),
  };
  const tAfterPreview = Date.now();
  const grayImage = rgbToGray(rgbImage);
  const tAfterRgbToGray = Date.now();
  // Border-calibrated whiteMask when a guide is available (always, for
  // now — computeChartGuideRect works on any image dims). Falls back
  // internally to the old percentile-anchor path if the border ring
  // has too few samples.
  const guideRect = computeChartGuideRect(rgbImage.width, rgbImage.height);
  const maskResult = whiteMask(rgbImage, undefined, guideRect);
  const {mask, lumaAnchor, lumaCutoff} = maskResult;
  const tAfterWhiteMask = Date.now();
  const previewMs = tAfterPreview - tBeforePreview;
  const rgbToGrayMs = tAfterRgbToGray - tAfterPreview;
  const whiteMaskMs = tAfterWhiteMask - tAfterRgbToGray;
  if (maskResult.usedBorderCalibration) {
    console.log(
      `[chartAnalysis] whiteMask: border-calibrated ` +
        `medRGB=(${maskResult.borderMedianR},${maskResult.borderMedianG},${maskResult.borderMedianB}) ` +
        `MAD=(${maskResult.borderMadR},${maskResult.borderMadG},${maskResult.borderMadB}) ` +
        `samples=${maskResult.borderSampleCount}`,
    );
  } else {
    console.log(
      `[chartAnalysis] whiteMask: fallback percentile ` +
        `anchor=${lumaAnchor} cutoff=${lumaCutoff} ` +
        `(border samples=${maskResult.borderSampleCount})`,
    );
  }
  console.log(
    `[chartAnalysis] preFrontend: preview=${previewMs}ms ` +
      `rgbToGray=${rgbToGrayMs}ms whiteMask=${whiteMaskMs}ms ` +
      `(preview ${rgbPreview.width}x${rgbPreview.height})`,
  );

  // 2. Chart registration. Uses the white mask to find hole-shaped
  //    inscribed circles (each hole shows white paper through it, and
  //    the off-white chart body encloses it) then RANSAC-matches
  //    against the 6×6 reference grid to fit the affine. On detection
  //    failure, return a partial-debug object so the UI can render the
  //    preview + white mask + whatever raw blobs were classified,
  //    plus a Share DNG button, so a dev can figure out what went wrong.
  // Per-page ref grid: RANSAC only rewards fits that land on hole
  // positions THIS specific page actually has. Prevents the shifted-
  // by-one wrong-alignment that the universal MAX grid allowed (a
  // wrong fit could score more than the correct one by lining up
  // paper false-positives with ref points where this page has no chip).
  const pageRefGrid = pageReferenceGridPoints(page);
  // Per-page sample grid — chips this specific page populates, plus
  // the test-swatch point at the end. Keeps matchedSampleRects tight
  // to real chip positions (no spurious red squares at physical
  // columns / rows the page leaves empty, e.g. WHITE's col 0).
  const pageSampleGrid = [...pageSampleGridPoints(page), TEST_SWATCH_POINT];
  // Paper anchor luma (rec.709) from whitemask border-ring calibration
  // — lets detectChartByRegions relax its "bright" cutoff for dim
  // captures where paper reads well below the fallback 170. Null when
  // the calibration ring didn't yield enough samples (whiteMask fell
  // back to the percentile path); classifyRegion then uses the historic
  // fixed cutoff.
  const paperLuma =
    maskResult.borderMedianR !== null &&
    maskResult.borderMedianG !== null &&
    maskResult.borderMedianB !== null
      ? rec709Luma(
          maskResult.borderMedianR,
          maskResult.borderMedianG,
          maskResult.borderMedianB,
        )
      : null;
  const grid = detectChartByRegions(
    grayImage,
    mask,
    pageRefGrid,
    algorithm,
    pageSampleGrid,
    paperLuma,
    // Reuse the same guide rect the whitemask calibrated against —
    // classifyRegion uses it to reject circles whose centres fall
    // outside the framing box (paper-shell noise near the frame edge,
    // common on dark-background captures).
    guideRect,
  );
  if (!grid) {
    // For failure debug — RAW gets the CIRAWFilter-rendered preview
    // PNG; PHOTO reuses the source file directly (it's already a
    // display-friendly image the RN <Image> can consume). BOTH paths
    // must report width/height in the SMALL PREVIEW coord space (the
    // same space every debug span is drawn in — brightMaskSpans,
    // guideRect, sample-area hash, ROI rects). RAW's renderPreview
    // returns the scaled-down dims naturally; PHOTO must use
    // rgbPreview.width/height, NOT sourceWidth/sourceHeight, or the
    // SVG viewBox blows up to full-sensor size and every debug span
    // ends up crammed into the top-left ~30% of the canvas.
    const preview =
      format === 'raw'
        ? DngDecoderHybrid.renderPreview(imagePath, PREVIEW_MAX_DIM)
        : {
            uri: imagePath.startsWith('file://')
              ? imagePath
              : `file://${imagePath}`,
            width: rgbPreview.width,
            height: rgbPreview.height,
          };
    // Populate a minimal GridDetection with just the whiteMask spans
    // so the debug view can render the mask overlay (blue) and the
    // dashed guide rect. Everything else is null/empty — enough for
    // the debug UI to bind to; the "detected/matched" layers just
    // don't render.
    const partialGrid: GridDetection = {
      centers: [],
      cellW: 0,
      cellH: 0,
      detected: [],
      rawBlobs: [],
      chartBodyBounds: null,
      brightMaskSpans: maskToSpans(mask, 4),
      chartBodyMaskSpans: [],
      matchedGrid: null,
      matchedGridInliers: null,
      matchedScore: null,
      matchedRefCount: null,
      matchedTripletDetected: null,
      matchedSampleRects: null,
    };
    const debug: MunsellChartFailureDebug = {
      reason:
        'detectChartByRegions returned null — too few detected candidates ' +
        'or clustering failed. Preview and white mask are still available.',
      lumaAnchor,
      lumaCutoff,
      preview: {
        uri: preview.uri,
        width: preview.width,
        height: preview.height,
      },
      grid: partialGrid,
    };
    // Dump the debug object to Metro so a dev can copy-paste the
    // structured reason + counts even without an IDE debugger attached.
    // Preview URI is elided — it's a local cache path that's noisy in
    // the console and unhelpful once the file is gone. Mask-span
    // count is a proxy for "did the whiteMask find any paper at all."
    console.log(
      `[chartAnalysis] FAILURE reason="${debug.reason}" ` +
        `lumaAnchor=${lumaAnchor} lumaCutoff=${lumaCutoff} ` +
        `previewSize=${preview.width}x${preview.height} ` +
        `whiteMaskSpans=${partialGrid.brightMaskSpans.length} ` +
        `algorithm=${algorithm} page=${page.name}`,
    );
    return {kind: 'failure', debug};
  }

  // 3. Compute per-cell sample rectangles in preview coords. Prefer
  //    the RANSAC-derived matchedSampleRects (transformed from
  //    pageSampleGridPoints which are page-specific and correctly
  //    positioned) when available. Fall back to grid.centers[r][c]
  //    from the older cluster-fit path if RANSAC didn't produce a
  //    match. The RANSAC-based positions correctly handle sparse
  //    pages like 10Y-5GY where cluster-fit's row-assignment scoring
  //    picks the wrong template-row alignment.
  const halfW = grid.cellW * SAMPLE_HALF_W_FRAC;
  const halfH = grid.cellH * SAMPLE_HALF_H_FRAC;
  const scaleX = rgbPreview.sourceWidth / rgbPreview.width;
  const scaleY = rgbPreview.sourceHeight / rgbPreview.height;
  // matchedSampleRects has one extra entry at the end for
  // TEST_SWATCH_POINT (chartAnalysis appends it to pageSampleGridPoints
  // before passing to detectChartByRegions), so it's exactly
  // cells.length + 1 entries. Slice off the trailing test-swatch to
  // align 1-to-1 with `cells`.
  const previewRects = cells.map((cell, i) => {
    if (grid.matchedSampleRects && grid.matchedSampleRects[i]) {
      const r = grid.matchedSampleRects[i];
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      return {
        x: Math.round(cx - halfW),
        y: Math.round(cy - halfH),
        w: Math.round(halfW * 2),
        h: Math.round(halfH * 2),
      };
    }
    const {x: cx, y: cy} = grid.centers[cell.rowIdx][cell.colIdx];
    return {
      x: Math.round(cx - halfW),
      y: Math.round(cy - halfH),
      w: Math.round(halfW * 2),
      h: Math.round(halfH * 2),
    };
  });
  const dngRois = previewRects.map(r => ({
    x: Math.round(r.x * scaleX),
    y: Math.round(r.y * scaleY),
    w: Math.round(r.w * scaleX),
    h: Math.round(r.h * scaleY),
  }));
  const measured =
    format === 'raw'
      ? DngDecoderHybrid.decodeDngRois(imagePath, dngRois)
      : DngDecoderHybrid.decodePhotoRois(imagePath, dngRois);

  // 4. Bundle each cell with its raw measurement. Munsell notation
  //    and ΔE come later — the screen recomputes them any time the
  //    user picks a different reference cell.
  const measurements: CellMeasurement[] = cells.map((cell, idx) => ({
    cell,
    rawLinearRgb: measured[idx],
  }));

  // 5. Colour preview for the validation view. RAW → renderPreview
  // (CIRAWFilter → PNG in temp). PHOTO → use the source file URI
  // directly; it's already a display-friendly image. width/height
  // must be the SMALL PREVIEW dims (same coord space as every debug
  // span). See the matching comment on the failure-path preview
  // above for why using sourceWidth/sourceHeight breaks the overlay.
  const preview =
    format === 'raw'
      ? DngDecoderHybrid.renderPreview(imagePath, PREVIEW_MAX_DIM)
      : {
          uri: imagePath.startsWith('file://')
            ? imagePath
            : `file://${imagePath}`,
          width: rgbPreview.width,
          height: rgbPreview.height,
        };

  // 6. If the RANSAC match ran, ALSO sample the 48 SAMPLE_GRID
  //    positions via the DNG decoder. These are the "new pipeline"
  //    per-swatch samples — same underlying pixel-sampling
  //    machinery, just at the match-based rect positions instead of
  //    the old cluster-fit ones. Not mapped to Munsell notations
  //    yet; caller decides what to do with the raw values.
  let matchedSampleValues: {r: number; g: number; b: number}[] | null = null;
  if (grid.matchedSampleRects) {
    const sampleDngRois = grid.matchedSampleRects.map(r => ({
      x: Math.round(r.x * scaleX),
      y: Math.round(r.y * scaleY),
      w: Math.round(r.w * scaleX),
      h: Math.round(r.h * scaleY),
    }));
    matchedSampleValues =
      format === 'raw'
        ? DngDecoderHybrid.decodeDngRois(imagePath, sampleDngRois)
        : DngDecoderHybrid.decodePhotoRois(imagePath, sampleDngRois);
  }

  return {
    kind: 'success',
    result: {
      measurements,
      grid,
      preview,
      previewRects,
      detectedSwatches: grid.detected,
      matchedSampleValues,
      testSwatchLinearRgb: matchedSampleValues
        ? (matchedSampleValues[matchedSampleValues.length - 1] ?? null)
        : null,
    },
  };
};

// Turn raw per-cell measurements into display-ready cell results,
// optionally after applying a WB correction that maps the reference
// cell's raw colour onto its expected colour. Two correction modes:
//
//  - Per-channel RGB gain (`useBradford = false`): scale each of R,
//    G, B independently in linear sRGB so the reference cell's raw
//    lands on its expected. Cheap and OK for near-neutral references
//    under near-neutral light.
//  - Bradford chromatic adaptation (`useBradford = true`): scale in
//    the LMS "cone response" space instead, which more accurately
//    models how physical illumination changes actually shift sensor
//    responses. More accurate for warmer/tinted illuminants or
//    strongly chromatic reference cells.
// Apply the same WB correction computeCellResults applies per cell,
// to any raw linear-sRGB triple. Exported so callers that need to
// display a WB-corrected colour without going through the full
// measurement→MunsellCellResult pipeline (e.g. the test-swatch cell,
// which has no Munsell notation) can share the exact same logic.
export const applyWbCorrection = (
  raw: {r: number; g: number; b: number},
  ref: CellMeasurement | undefined,
  useBradford: boolean = false,
): {r: number; g: number; b: number} => {
  const rgbScale = wbRgbScaleFromReference(ref);
  const bfdScale = useBradford ? bradfordScaleFromReference(ref) : null;
  return bfdScale
    ? bradfordAdapt(raw, bfdScale)
    : {
        r: raw.r * rgbScale.r,
        g: raw.g * rgbScale.g,
        b: raw.b * rgbScale.b,
      };
};

export const computeCellResults = (
  measurements: readonly CellMeasurement[],
  // WB reference to correct against — resolved by the caller so this
  // function doesn't need to know how the notation-to-measurement
  // lookup works (in particular, the test-swatch synthetic reference
  // has a notation the munsell library can't parse and must not appear
  // in the `measurements` array below, or the per-cell munsellToLab
  // conversion inside the map would throw).
  ref: CellMeasurement | undefined,
  useBradford: boolean = false,
): MunsellCellResult[] => {
  return measurements.map(({cell, rawLinearRgb}) => {
    const measuredLinearRgb = applyWbCorrection(rawLinearRgb, ref, useBradford);
    const [X, Y, Z] = linearRgbToXyz(
      measuredLinearRgb.r,
      measuredLinearRgb.g,
      measuredLinearRgb.b,
    );
    const measuredLab = xyzToLab(X, Y, Z);
    const expectedLab = munsellToLab(cell.notation);
    const deltaE = DeltaE.getDeltaE00(
      {L: measuredLab[0], A: measuredLab[1], B: measuredLab[2]},
      {L: expectedLab[0], A: expectedLab[1], B: expectedLab[2]},
    );
    const measuredMunsell = safeLabToMunsell(measuredLab, cell.notation);
    return {cell, measuredLinearRgb, measuredMunsell, deltaE};
  });
};

// Per-channel scale factor to apply to every raw measurement so that
// the reference cell's raw colour maps onto its expected colour.
// Returns (1, 1, 1) when no reference is set or when the raw values
// are too small to divide by safely.
const wbRgbScaleFromReference = (
  ref: CellMeasurement | undefined,
): {r: number; g: number; b: number} => {
  if (!ref) return {r: 1, g: 1, b: 1};
  const {rawLinearRgb: raw, cell} = ref;
  const {r: er, g: eg, b: eb} = cell.expectedLinearRgb;
  const MIN = 1e-4;
  return {
    r: raw.r > MIN ? er / raw.r : 1,
    g: raw.g > MIN ? eg / raw.g : 1,
    b: raw.b > MIN ? eb / raw.b : 1,
  };
};

// ---------------------------------------------------------------------------
// Bradford chromatic adaptation. Illumination changes are best
// approximated as a per-channel diagonal scale in LMS "cone response"
// space rather than in linear sRGB — so we transform to LMS via the
// Bradford matrix, scale per channel there, then transform back to
// XYZ and finally to linear sRGB for storage.

// Bradford XYZ → LMS matrix (Lam 1985; standard CIE definition).
const M_BFD: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
] = [
  [0.8951, 0.2664, -0.1614],
  [-0.7502, 1.7135, 0.0367],
  [0.0389, -0.0685, 1.0296],
];
// Inverse of M_BFD (LMS → XYZ).
const M_BFD_INV: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
] = [
  [0.9869929, -0.1470543, 0.1599627],
  [0.4323053, 0.5183603, 0.049291],
  [-0.0085287, 0.0400428, 0.9684867],
];
// XYZ → linear sRGB (Rec.709 primaries, D65) — standard sRGB inverse
// matrix. Needed to convert corrected XYZ back into linear sRGB for
// storage in `measuredLinearRgb`.
const M_XYZ_TO_LRGB: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
] = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];

const mat3Vec = (
  M: readonly (readonly [number, number, number])[],
  v: readonly [number, number, number],
): [number, number, number] => [
  M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
  M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
  M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
];

// Bradford scale in LMS space. Computed once per (reference, chart)
// pair — same factor applies to every measurement.
const bradfordScaleFromReference = (
  ref: CellMeasurement | undefined,
): [number, number, number] | null => {
  if (!ref) return null;
  const rawXyz = linearRgbToXyz(
    ref.rawLinearRgb.r,
    ref.rawLinearRgb.g,
    ref.rawLinearRgb.b,
  ) as [number, number, number];
  const expXyz = linearRgbToXyz(
    ref.cell.expectedLinearRgb.r,
    ref.cell.expectedLinearRgb.g,
    ref.cell.expectedLinearRgb.b,
  ) as [number, number, number];
  const rawLms = mat3Vec(M_BFD, rawXyz);
  const expLms = mat3Vec(M_BFD, expXyz);
  const MIN = 1e-6;
  return [
    Math.abs(rawLms[0]) > MIN ? expLms[0] / rawLms[0] : 1,
    Math.abs(rawLms[1]) > MIN ? expLms[1] / rawLms[1] : 1,
    Math.abs(rawLms[2]) > MIN ? expLms[2] / rawLms[2] : 1,
  ];
};

// Apply a Bradford scale to a raw linear-sRGB triple: convert to XYZ,
// to LMS, scale each cone response, back to XYZ, back to linear sRGB.
const bradfordAdapt = (
  rawLinearRgb: {r: number; g: number; b: number},
  scale: readonly [number, number, number],
): {r: number; g: number; b: number} => {
  const xyz = linearRgbToXyz(
    rawLinearRgb.r,
    rawLinearRgb.g,
    rawLinearRgb.b,
  ) as [number, number, number];
  const lms = mat3Vec(M_BFD, xyz);
  const lmsScaled: [number, number, number] = [
    lms[0] * scale[0],
    lms[1] * scale[1],
    lms[2] * scale[2],
  ];
  const xyzAdapted = mat3Vec(M_BFD_INV, lmsScaled);
  const rgb = mat3Vec(M_XYZ_TO_LRGB, xyzAdapted);
  return {r: rgb[0], g: rgb[1], b: rgb[2]};
};

// Dev export: one row per swatch, with the same Munsell / ΔE the
// on-screen grid shows plus the expected + measured colour as
// LINEAR sRGB triples. Linear-sRGB is what the whole correction /
// Munsell-conversion pipeline actually operates in, so exporting
// those values keeps the CSV numerically comparable to the internal
// computations. Values are floats in 0..1 (may exceed 1.0 after WB
// over-scaling — kept unclamped so out-of-range values stay visible
// to the tester).
export const csvFromCells = (
  cells: readonly MunsellCellResult[],
  referenceNotation: string | null,
): string => {
  const header = [
    'notation_expected',
    'notation_measured',
    'delta_e',
    'r_expected',
    'g_expected',
    'b_expected',
    'r_measured',
    'g_measured',
    'b_measured',
    'is_reference',
  ].join(',');
  const rows = cells.map(c =>
    [
      csvQuote(c.cell.notation),
      csvQuote(c.measuredMunsell),
      c.deltaE.toFixed(2),
      c.cell.expectedLinearRgb.r.toFixed(4),
      c.cell.expectedLinearRgb.g.toFixed(4),
      c.cell.expectedLinearRgb.b.toFixed(4),
      c.measuredLinearRgb.r.toFixed(4),
      c.measuredLinearRgb.g.toFixed(4),
      c.measuredLinearRgb.b.toFixed(4),
      c.cell.notation === referenceNotation ? 'true' : 'false',
    ].join(','),
  );
  return [header, ...rows].join('\n') + '\n';
};

const csvQuote = (s: string) => `"${s.replace(/"/g, '""')}"`;

// labToMunsell can throw on out-of-gamut points or hit its iteration
// cap. When it does, return the expected notation as a fallback so
// the UI has something to render; the ΔE column still reflects the
// true measurement.
const safeLabToMunsell = (
  lab: readonly [number, number, number],
  fallback: string,
): string => {
  try {
    return labToMunsell(lab[0], lab[1], lab[2]);
  } catch {
    return `${CHART_HUE} (?)  [fallback: ${fallback}]`;
  }
};
