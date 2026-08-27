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

import {type CellMeasurement} from 'terraso-mobile-client/screens/MunsellChartValidator/cellResults';
import {computeChartGuideRect} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {type DngDecoderLike} from 'terraso-mobile-client/screens/MunsellChartValidator/dngDecoderShim';
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
  MULTI_CARD_POINTS,
  TEST_SWATCH_POINT,
  type RegistrationAlgorithm,
} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {
  MUNSELL_PAGES,
  pageCells,
  pageReferenceGridPoints,
  pageSampleGridPoints,
  type MunsellPage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

// Re-export the pure-JS derivation surface from cellResults so
// existing callers (the RN screen, tests) don't need to know it's
// been split out for Node reuse.
export {
  applyWbCorrection,
  computeArbitraryResult,
  computeCellResults,
  csvFromCells,
  DEFAULT_REFERENCE_NOTATION,
  TEST_SWATCH_REFERENCE_NOTATION,
  type CellMeasurement,
  type MunsellCellResult,
} from 'terraso-mobile-client/screens/MunsellChartValidator/cellResults';

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

export type MunsellChartResult = {
  measurements: CellMeasurement[];
  // Grid geometry the detector found — includes per-detected-blob
  // entries the validation view uses to draw diagnostics.
  grid: GridDetection;
  // Preview PNG for the "did the auto-registration land on the right
  // pixels?" view. Rendered from the same DNG at the same maxDim so
  // the previewRects below index into its pixel space directly.
  preview: {uri: string; width: number; height: number};
  // Source-image dimensions (the DNG or JPEG the previewRects need to
  // be scaled up to for a direct decodeDngRois / decodePhotoRois call).
  // Analyzer post-hoc sweeps use this to shift + resample without
  // re-reading the preview just to recover the source dims.
  sourceDimensions: {width: number; height: number};
  // Per-cell sampling rectangle in preview-space pixels. Same length
  // as `measurements`. Rendered as red-outlined overlays on top of the
  // preview so a tester can visually confirm each rect lands on the
  // correct swatch.
  previewRects: {x: number; y: number; w: number; h: number}[];
  // Ref-card sample rectangle in preview-space pixels — the extra
  // sample position appended to the per-page sample grid (either the
  // default TEST_SWATCH_POINT or page.refCardPoint). Rendered on the
  // debug overlay alongside `previewRects` so the tester can confirm
  // the ref card sample lands where expected. Null if RANSAC didn't
  // run (no matchedSampleRects to derive it from).
  refCardRect: {x: number; y: number; w: number; h: number} | null;
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
  // Median-cut dominant companion for testSwatchLinearRgb — same
  // sample rect, biggest-cluster reducer instead of per-channel mean.
  // Populated on RAW path only (photo path leaves it null).
  testSwatchLinearRgbDominant: {r: number; g: number; b: number} | null;
  // Multi-card mode: raw linear-sRGB at each MULTI_CARD_POINTS slot.
  // Null when the caller ran single-card mode (default); otherwise a
  // per-slot array in MULTI_CARD_POINTS declaration order (whibal,
  // postit, greycard, white).
  multiRefCards: Array<{
    name: 'whibal' | 'postit' | 'greycard' | 'white';
    linearRgb: {r: number; g: number; b: number};
    // Pre-clamp linear-sRGB mean; drives WB-scale division when
    // available so bright anchors aren't under-corrected. Null when
    // the underlying decoder path doesn't expose it (JPEG / Swift
    // iOS DNG); WB code falls back to linearRgb in that case.
    // Populated by the analyzer's C++ CLI batch endpoint (mac +
    // Android DNGs). See CellMeasurement.rawLinearRgbUnclamped for
    // the reason.
    linearRgbUnclamped: {r: number; g: number; b: number} | null;
    // Median-cut dominant companion. Populated on RAW path; null on
    // photo path (see CellMeasurement.rawLinearRgbDominant note).
    linearRgbDominant: {r: number; g: number; b: number} | null;
    rect: {x: number; y: number; w: number; h: number};
    // Union of every rect the multi-card sweep considered for this
    // slot — the "search area" over which the H×V grid was scanned.
    // Populated by the analyzer's sweep only (null on the app-side
    // path and when the sweep didn't run). Rendered as an overlay
    // in run.html so a reviewer can eyeball "did the sweep search
    // where the card actually is, or did the range cap us short?".
    searchArea: {x: number; y: number; w: number; h: number} | null;
  }> | null;
};

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
  | {kind: 'failure'; debug: MunsellChartFailureDebug}
  // Registration succeeded but the caller asked to stop before the
  // per-ROI decode (register-only mode). Same debug payload as
  // failure — preview + grid + white-mask spans — so the UI can render
  // the same "here's what registration produced" view with just a
  // different heading. No `result` because no measurements were made.
  | {kind: 'registered'; debug: MunsellChartFailureDebug};

// How far to run the chart analysis pipeline. Threaded through from
// the RawColorToolsScreen setting so the tester can pick between a
// bare capture (no analysis at all — screen just shows the JPEG /
// preview + share), a registration-only run (chart-guide detection +
// RANSAC + white-mask overlay, stop before per-ROI decode), and the
// full analysis (registration + decode + Munsell match). Handy
// backup when full analysis errors on a new device and you still
// want to inspect what the earlier stages saw.
export type AnalysisMode = 'capture' | 'register' | 'full';

// Post-hoc shift + scale applied to the analyzer's chart-guide rect
// before whiteMask calibration + chart detection. Rescues captures
// where the chart is systematically off-guide relative to what the
// on-screen framing implied (typical on Pixel devices that don't
// support DISTORTION_CORRECTION_MODE_OFF — the HAL corrects the
// Preview stream inward, so what looks framed on-screen lands
// mis-framed in the DNG/JPEG). All fields optional; defaults are
// identity (shiftX=0, shiftY=0, scale=1).
//
//   shiftX / shiftY: fraction of PREVIEW width/height to shift the
//                    guide center by. E.g. shiftX=0.1 moves the
//                    guide 10% of preview width to the right.
//   scale:           multiplied into the guide's width AND height
//                    (isotropic — anisotropic would need shape drift
//                    modelling we don't do yet). scale=0.8 shrinks
//                    the expected chart footprint to 80%.
export type GuideAdjustment = {
  shiftX?: number;
  shiftY?: number;
  scale?: number;
};

// 'raw' → route through CIRAWFilter (readPreviewRgb / decodeDngRois),
// 'photo' → route through CIImage (readPreviewRgbPhoto /
// decodePhotoRois). Everything downstream is identical — both paths
// return interleaved 3-byte-per-pixel sRGB previews and linear-sRGB
// ROIs. See the caveat in the photo variants' comments: photo pixels
// have already been WB-corrected + tone-curved by Apple's ISP.
export type ChartFormat = 'raw' | 'photo';

export const analyzeMunsellChart = async (
  decoder: DngDecoderLike,
  imagePath: string,
  page: MunsellPage = MUNSELL_PAGES[0],
  format: ChartFormat = 'raw',
  algorithm: RegistrationAlgorithm = DEFAULT_REGISTRATION_ALGORITHM,
  // Multi-card mode: append the three MULTI_CARD_POINTS to the
  // sample grid so the analyser also decodes the taped-alongside
  // whibal/postit/greycard slots. When false, only the legacy
  // single ref-card slot is sampled.
  multiCards = false,
  // When true, run registration (chart-guide detection + RANSAC +
  // white-mask overlay) and then return with a 'registered' outcome
  // BEFORE the per-ROI decode. Used by the register-only analysis
  // mode as a fallback when the full decode path errors on a new
  // device — the tester still gets to see what registration produced.
  stopAfterRegistration = false,
  // Rescue knob for captures where the chart is systematically off-
  // guide (see GuideAdjustment doc). Applied AFTER computeChartGuideRect
  // and BEFORE the guide rect flows into whiteMask + detectChartByRegions.
  guideAdjustment?: GuideAdjustment,
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
      ? decoder.readPreviewRgb(imagePath, PREVIEW_MAX_DIM)
      : decoder.readPreviewRgbPhoto(imagePath, PREVIEW_MAX_DIM);
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
  let guideRect = computeChartGuideRect(rgbImage.width, rgbImage.height);
  // Rescue knob: shift+scale the analyzer's guide rect (fraction of
  // preview dims for shifts; multiplicative for scale). See
  // GuideAdjustment docs for why this exists (systematic HAL FoV
  // mismatch on some Android devices). Identity by default.
  if (guideAdjustment) {
    const {shiftX = 0, shiftY = 0, scale = 1} = guideAdjustment;
    const cx = guideRect.x + guideRect.w / 2 + shiftX * rgbImage.width;
    const cy = guideRect.y + guideRect.h / 2 + shiftY * rgbImage.height;
    const w = guideRect.w * scale;
    const h = guideRect.h * scale;
    guideRect = {
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      w: Math.round(w),
      h: Math.round(h),
    };
    console.log(
      `[chartAnalysis] guideAdjustment applied: shift=(${shiftX},${shiftY}) scale=${scale}`,
    );
  }
  // Diagnostic: log the analyser's guide rect as a fraction of the
  // preview. Should MATCH the ChartGuideOverlay's fracOfContainer
  // logged at capture time — if it doesn't, the on-screen guide the
  // user framed to did not correspond to this analyser rect, and
  // registration will search for chips at the wrong scale.
  console.log(
    `[chartAnalysis] guideRect in preview: ${guideRect.w.toFixed(0)}x${guideRect.h.toFixed(0)}` +
      ` at (${guideRect.x.toFixed(0)},${guideRect.y.toFixed(0)})` +
      ` fracOfPreview=${(guideRect.w / rgbImage.width).toFixed(3)}x${(guideRect.h / rgbImage.height).toFixed(3)}` +
      ` (preview aspect=${(rgbImage.width / rgbImage.height).toFixed(3)})`,
  );
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
  // the ref-card point at the end. Keeps matchedSampleRects tight
  // to real chip positions (no spurious red squares at physical
  // columns / rows the page leaves empty, e.g. WHITE's col 0).
  // Ref card falls at the page's refCardPoint override when set
  // (fully-populated pages like GLEY1/GLEY2), else at the default
  // bottom-right corner slot that stays empty on most pages.
  const refCardPoint = page.refCardPoint ?? TEST_SWATCH_POINT;
  // Multi mode: append the 3 fixed MULTI_CARD_POINTS AFTER the
  // legacy single ref-card slot. Downstream (matchedSampleValues)
  // sees the sample grid as:
  //   [ page chips ..., legacy refCardPoint, whibal, postit, greycard ]
  // so the legacy testSwatchLinearRgb index (length - 1) becomes the
  // greycard slot's raw when multi is on — kept correct by taking
  // matchedSampleValues[length - MULTI_CARD_POINTS.length - 1] in
  // single-card mode below.
  const pageSampleGrid = multiCards
    ? [
        ...pageSampleGridPoints(page),
        refCardPoint,
        ...MULTI_CARD_POINTS.map(p => ({x: p.x, y: p.y})),
      ]
    : [...pageSampleGridPoints(page), refCardPoint];
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
  // RANSAC is stochastic — its random-triplet iterator can converge
  // to different transforms on different invocations if the search
  // space has multiple local optima. On some fixtures the wrong
  // one-column-shifted transform is a plausible-looking local optimum
  // that RANSAC sometimes lands on. Retry up to MAX_REGISTRATION_
  // ATTEMPTS times, checking the centroid shift after each attempt
  // and keeping the best-scoring one. Only give up if all attempts
  // drifted beyond the reject threshold — that usually means the
  // capture is genuinely misframed, not just that RANSAC drifted.
  //
  // findFlatCircles + classification is deterministic given the same
  // mask, so we're only retrying the RANSAC-and-downstream steps;
  // findFlatCircles' ~30-50ms cost gets repeated per attempt but the
  // absolute wall-clock is still small.
  // Reject the fit if its centroid drifted more than this fraction
  // of ONE column-spacing off from where the guide expected the
  // chart center. Set at 0.8 (was 0.5) to accept moderately off-
  // centre framings — real one-column-shifted mis-registrations
  // still show as ≈1.0 and get caught. See gridRegistration.ts:855
  // for the calculation. Bumped from 0.5 after most-of-a-batch
  // failures on Pixel captures scored h=0.6-0.8 due to slight user
  // framing error, not analyzer error.
  const CENTROID_SHIFT_REJECT_FRAC = 0.85;
  const MAX_REGISTRATION_ATTEMPTS = 5;
  let grid: GridDetection | null = null;
  let bestGrid: GridDetection | null = null;
  let bestMaxOff = Infinity;
  let attemptsSummary: string[] = [];
  for (let attempt = 1; attempt <= MAX_REGISTRATION_ATTEMPTS; attempt++) {
    const g = detectChartByRegions(
      grayImage,
      mask,
      pageRefGrid,
      algorithm,
      pageSampleGrid,
      paperLuma,
      // Reuse the same guide rect the whitemask calibrated against —
      // classifyRegion uses it to reject circles whose centres fall
      // outside the framing box (paper-shell noise near the frame
      // edge, common on dark-background captures).
      guideRect,
    );
    if (!g) {
      // Deterministic failure — no circles or no clusters. Retrying
      // won't help because the same mask feeds findFlatCircles the
      // same way.
      attemptsSummary.push(`#${attempt}=NULL`);
      break;
    }
    const h = g.maxHOffsetFrac ?? 0;
    const v = g.maxVOffsetFrac ?? 0;
    const maxOff = Math.max(h, v);
    attemptsSummary.push(`#${attempt}=(h=${h.toFixed(2)},v=${v.toFixed(2)})`);
    if (maxOff < bestMaxOff) {
      bestMaxOff = maxOff;
      bestGrid = g;
    }
    if (maxOff <= CENTROID_SHIFT_REJECT_FRAC) {
      grid = g;
      break;
    }
  }
  if (!grid && bestGrid && bestMaxOff <= CENTROID_SHIFT_REJECT_FRAC) {
    grid = bestGrid;
  }
  // Copy the whiteMask border-ring RGB medians onto the grid so
  // downstream (analyze-fixtures) can synthesise a 'paper' ref card.
  // Patched here rather than passed through detectChartByRegions since
  // the values come from maskResult, which sits in this scope.
  const patchPaperMedians = (g: GridDetection | null) => {
    if (!g) return;
    g.paperMedianR = maskResult.borderMedianR;
    g.paperMedianG = maskResult.borderMedianG;
    g.paperMedianB = maskResult.borderMedianB;
  };
  patchPaperMedians(grid);
  patchPaperMedians(bestGrid);
  if (attemptsSummary.length > 1) {
    console.log(
      `[chartAnalysis] RANSAC attempts (${attemptsSummary.length}): ` +
        attemptsSummary.join(' '),
    );
  }
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
        ? decoder.renderPreview(imagePath, PREVIEW_MAX_DIM)
        : {
            uri: imagePath.startsWith('file://')
              ? imagePath
              : `file://${imagePath}`,
            width: rgbPreview.width,
            height: rgbPreview.height,
          };
    // Two failure sub-modes:
    //   (a) bestGrid == null — findFlatCircles / clustering returned
    //       nothing in every attempt (deterministic; retry doesn't
    //       help). Show a minimal-grid overlay with just the whitemask
    //       spans so the debug view can still render the blue overlay
    //       and the dashed guide rect.
    //   (b) bestGrid != null — every attempt found candidates but the
    //       centroid shift exceeded the reject threshold every time.
    //       The chart is probably genuinely mis-framed (rotated, off-
    //       centre, or with the wrong crop). Show the BEST-attempt
    //       grid so the misalignment is visible in the debug overlay.
    const partialGrid: GridDetection = bestGrid ?? {
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
      matchedColStepPx: null,
      matchedRowStepPx: null,
      matchedScore: null,
      matchedRefCount: null,
      matchedTripletDetected: null,
      matchedSampleRects: null,
      matchedGridBrightness: null,
      avgLuma: 0,
      paperLuma: null,
      paperMedianR: null,
      paperMedianG: null,
      paperMedianB: null,
      brightPaperOnDark: null,
      nKept: 0,
      rejectCounts: {
        area_low: 0,
        area_high: 0,
        touches_edge: 0,
        outside_guide: 0,
      },
      maxHOffsetFrac: null,
      maxVOffsetFrac: null,
    };
    const reason = bestGrid
      ? `RANSAC fits all rejected — best attempt centroid shift ` +
        `(h=${bestGrid.maxHOffsetFrac?.toFixed(2) ?? '?'}, ` +
        `v=${bestGrid.maxVOffsetFrac?.toFixed(2) ?? '?'}) ` +
        `exceeded reject threshold ${CENTROID_SHIFT_REJECT_FRAC} on all ` +
        `${MAX_REGISTRATION_ATTEMPTS} attempts. Chart is probably ` +
        `misframed — try reframing centred in the guide.`
      : 'detectChartByRegions returned null — too few detected candidates ' +
        'or clustering failed. Preview and white mask are still available.';
    const debug: MunsellChartFailureDebug = {
      reason,
      lumaAnchor,
      lumaCutoff,
      preview: {
        uri: preview.uri,
        width: preview.width,
        height: preview.height,
      },
      grid: partialGrid,
    };
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
  //
  //    SIZING: when RANSAC locked, use matchedColStepPx/matchedRowStepPx
  //    (the RANSAC affine's own step sizes) for halfW / halfH. Cluster-
  //    fit cellW/cellH can be 2× too large on sparse pages even when
  //    RANSAC lands correctly — same fit produces correctly-placed
  //    yellow rings but wildly-wide red sample rects if we sourced size
  //    from the cluster fit.
  const useMatchedSteps =
    grid.matchedColStepPx !== null && grid.matchedRowStepPx !== null;
  const baseW = useMatchedSteps ? grid.matchedColStepPx! : grid.cellW;
  const baseH = useMatchedSteps ? grid.matchedRowStepPx! : grid.cellH;
  const halfW = baseW * SAMPLE_HALF_W_FRAC;
  const halfH = baseH * SAMPLE_HALF_H_FRAC;
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
  // Ref-card sample rect position within matchedSampleRects:
  //   single mode → last entry
  //   multi mode  → (length - MULTI_CARD_POINTS.length - 1) — i.e.,
  //                 the legacy refCardPoint, which still sits between
  //                 the page chips and the appended multi points.
  const legacyRefIdx = grid.matchedSampleRects
    ? multiCards
      ? grid.matchedSampleRects.length - MULTI_CARD_POINTS.length - 1
      : grid.matchedSampleRects.length - 1
    : -1;
  const rectAtIdx = (i: number) => {
    const r = grid.matchedSampleRects![i];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    return {
      x: Math.round(cx - halfW),
      y: Math.round(cy - halfH),
      w: Math.round(halfW * 2),
      h: Math.round(halfH * 2),
    };
  };
  const refCardRect =
    grid.matchedSampleRects && legacyRefIdx >= 0
      ? rectAtIdx(legacyRefIdx)
      : null;
  const dngRois = previewRects.map(r => ({
    x: Math.round(r.x * scaleX),
    y: Math.round(r.y * scaleY),
    w: Math.round(r.w * scaleX),
    h: Math.round(r.h * scaleY),
  }));

  // Register-only mode: stop here, return the same debug payload the
  // failure UI renders. Skip the per-ROI decode (which is the
  // expensive + failure-prone step) and let the user inspect what
  // registration produced without running into decode issues.
  if (stopAfterRegistration) {
    const registeredPreview =
      format === 'raw'
        ? decoder.renderPreview(imagePath, PREVIEW_MAX_DIM)
        : {
            uri: imagePath.startsWith('file://')
              ? imagePath
              : `file://${imagePath}`,
            width: rgbPreview.width,
            height: rgbPreview.height,
          };
    console.log(
      `[chartAnalysis] REGISTERED (register-only mode) previewSize=${registeredPreview.width}x${registeredPreview.height}`,
    );
    return {
      kind: 'registered',
      debug: {
        reason: 'registration-only mode (decode skipped)',
        lumaAnchor,
        lumaCutoff,
        preview: {
          uri: registeredPreview.uri,
          width: registeredPreview.width,
          height: registeredPreview.height,
        },
        grid,
      },
    };
  }

  // Decode can fail if registration was so bad that one or more ROIs
  // project outside the sensor bounds. Fall through to the failure
  // state with the preview + grid we already have, so the debug view
  // renders instead of the plain error text. Users can then eyeball
  // what went wrong (chart mis-framed, poor focus, etc.).
  let measured: {r: number; g: number; b: number}[];
  // Parallel `measuredDominant` populated only on the RAW path — the
  // photo (CIImage) path can't cheaply do per-pixel median-cut, so
  // dominant stays null there and downstream code treats the reducer
  // as "mean only" for photos.
  let measuredDominant: ({r: number; g: number; b: number} | null)[] = [];
  // Parallel to `measured`. Pre-clamp per-chip means from the C++ DNG
  // pipeline; null on photo path (CIImage can't give us pre-clamp)
  // and on iOS Swift DNG (CIRAWFilter clamps at the source). Flows
  // through to CellMeasurement.rawLinearRgbUnclamped so bright chips
  // (5/6+ value) get the true post-WB signal into downstream ΔE math
  // instead of the clipped-to-1.0 mean.
  let measuredUnclamped: ({r: number; g: number; b: number} | null)[] = [];
  try {
    if (format === 'raw') {
      const reduced = decoder.decodeDngRoisReduced(imagePath, dngRois);
      measured = reduced.map(r => r.mean);
      measuredDominant = reduced.map(r => r.dominant);
      measuredUnclamped = reduced.map(r => r.meanUnclamped ?? null);
    } else {
      measured = decoder.decodePhotoRois(imagePath, dngRois);
      measuredDominant = dngRois.map(() => null);
      measuredUnclamped = dngRois.map(() => null);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const failurePreview =
      format === 'raw'
        ? decoder.renderPreview(imagePath, PREVIEW_MAX_DIM)
        : {
            uri: imagePath.startsWith('file://')
              ? imagePath
              : `file://${imagePath}`,
            width: rgbPreview.width,
            height: rgbPreview.height,
          };
    console.log(
      `[chartAnalysis] FAILURE decode-threw reason="${msg}" ` +
        `previewSize=${failurePreview.width}x${failurePreview.height}`,
    );
    return {
      kind: 'failure',
      debug: {
        reason: `decode failed after registration: ${msg}`,
        lumaAnchor,
        lumaCutoff,
        preview: {
          uri: failurePreview.uri,
          width: failurePreview.width,
          height: failurePreview.height,
        },
        grid,
      },
    };
  }

  // 4. Bundle each cell with its raw measurement. Munsell notation
  //    and ΔE come later — the screen recomputes them any time the
  //    user picks a different reference cell.
  const measurements: CellMeasurement[] = cells.map((cell, idx) => ({
    cell,
    rawLinearRgb: measured[idx],
    rawLinearRgbDominant: measuredDominant[idx],
    rawLinearRgbUnclamped: measuredUnclamped[idx],
  }));

  // 5. Colour preview for the validation view. RAW → renderPreview
  // (CIRAWFilter → PNG in temp). PHOTO → use the source file URI
  // directly; it's already a display-friendly image. width/height
  // must be the SMALL PREVIEW dims (same coord space as every debug
  // span). See the matching comment on the failure-path preview
  // above for why using sourceWidth/sourceHeight breaks the overlay.
  const preview =
    format === 'raw'
      ? decoder.renderPreview(imagePath, PREVIEW_MAX_DIM)
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
  // Parallel to matchedSampleValues: dominant reducer per matched
  // sample rect. Same length + ordering; null entries where the reducer
  // isn't available (photo path).
  let matchedSampleValuesDominant:
    | ({r: number; g: number; b: number} | null)[]
    | null = null;
  // Parallel unclamped-mean array so the multi ref-card slot seed
  // rows carry a pre-clamp signal into WB math when the sweep
  // doesn't run (e.g. on-device path). Null-entries where the
  // decoder can't produce one (photo, iOS Swift DNG).
  let matchedSampleValuesUnclamped:
    | ({r: number; g: number; b: number} | null)[]
    | null = null;
  if (grid.matchedSampleRects) {
    const sampleDngRois = grid.matchedSampleRects.map(r => ({
      x: Math.round(r.x * scaleX),
      y: Math.round(r.y * scaleY),
      w: Math.round(r.w * scaleX),
      h: Math.round(r.h * scaleY),
    }));
    try {
      if (format === 'raw') {
        const reduced = decoder.decodeDngRoisReduced(imagePath, sampleDngRois);
        matchedSampleValues = reduced.map(r => r.mean);
        matchedSampleValuesDominant = reduced.map(r => r.dominant);
        matchedSampleValuesUnclamped = reduced.map(
          r => r.meanUnclamped ?? null,
        );
      } else {
        matchedSampleValues = decoder.decodePhotoRois(imagePath, sampleDngRois);
        matchedSampleValuesDominant = sampleDngRois.map(() => null);
        matchedSampleValuesUnclamped = sampleDngRois.map(() => null);
      }
    } catch (err) {
      // Match-rect decode is optional (falls back to grid.centers via
      // the null check on matchedSampleValues elsewhere). Log and
      // continue so a marginal match doesn't kill the whole run.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[chartAnalysis] matched-rect decode threw; skipping (${msg})`,
      );
    }
  }

  // Legacy single-card index: same slot as refCardRect above. In
  // multi mode this is NOT the last matchedSampleValues entry
  // (those are the 3 multi slots), so index explicitly.
  const testSwatchLinearRgb =
    matchedSampleValues && legacyRefIdx >= 0
      ? (matchedSampleValues[legacyRefIdx] ?? null)
      : null;
  const testSwatchLinearRgbDominant =
    matchedSampleValuesDominant && legacyRefIdx >= 0
      ? (matchedSampleValuesDominant[legacyRefIdx] ?? null)
      : null;
  // In multi mode, the last MULTI_CARD_POINTS.length entries of
  // matchedSampleValues correspond to the 3 fixed slots in declared
  // order. Pair each with its slot name + preview rect.
  const multiRefCards =
    multiCards && matchedSampleValues && grid.matchedSampleRects
      ? MULTI_CARD_POINTS.map((slot, i) => {
          const valueIdx =
            matchedSampleValues.length - MULTI_CARD_POINTS.length + i;
          const rectIdx =
            grid.matchedSampleRects!.length - MULTI_CARD_POINTS.length + i;
          return {
            name: slot.name,
            linearRgb: matchedSampleValues[valueIdx],
            // Seed unclamped mean from the initial chart decode when
            // the decoder exposes it (mac dng-cli-cpp path). On
            // decoders that don't produce it (photo, iOS Swift DNG,
            // on-device Nitro) this stays null and the analyzer
            // sweep may fill it in on a later mutation pass.
            linearRgbUnclamped:
              matchedSampleValuesUnclamped?.[valueIdx] ?? null,
            linearRgbDominant: matchedSampleValuesDominant?.[valueIdx] ?? null,
            rect: rectAtIdx(rectIdx),
            // Search area only known after the analyzer's post-hoc
            // sweep runs (see maybeSweepMultiCardOffset in
            // scripts/analyze-fixtures.ts). Default null; sweep
            // mutates in place when it computes the union.
            searchArea: null,
          };
        })
      : null;
  return {
    kind: 'success',
    result: {
      measurements,
      grid,
      preview,
      sourceDimensions: {
        width: rgbPreview.sourceWidth,
        height: rgbPreview.sourceHeight,
      },
      previewRects,
      refCardRect,
      detectedSwatches: grid.detected,
      matchedSampleValues,
      testSwatchLinearRgb,
      testSwatchLinearRgbDominant,
      multiRefCards,
    },
  };
};
