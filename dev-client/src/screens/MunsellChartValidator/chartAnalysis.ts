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

import {
  detectChartByGrid,
  type GridDetection,
  type GridEntry,
} from 'terraso-mobile-client/screens/MunsellChartValidator/gridRegistration';
import {
  CHART_CHROMAS,
  CHART_HUE,
  CHART_VALUES,
  MUNSELL_10YR_CELLS,
  type MunsellChartCell,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';

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
  cell: MunsellChartCell;
  rawLinearRgb: {r: number; g: number; b: number};
};

export type MunsellCellResult = {
  cell: MunsellChartCell;
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
};

// Sensible default reference cell: 10YR 5/1 is a mid-value, low-chroma
// neutral — the most colour-agnostic of the swatches on the 10YR page,
// so best-suited to define "grey" for WB. Testers can tap any other
// cell in the result grid to override.
export const DEFAULT_REFERENCE_NOTATION = '10YR 5/1';

export const analyzeMunsellChart = async (
  dngPath: string,
): Promise<MunsellChartResult> => {
  // 1. Grayscale render for the CV.
  const gray = DngDecoderHybrid.readPreviewGrayscale(dngPath, PREVIEW_MAX_DIM);
  const grayImage = {
    width: gray.width,
    height: gray.height,
    pixels: new Uint8Array(gray.pixels),
  };

  // 2. Find the swatch grid directly — much more robust than trying
  //    to identify the chart card body (which can lose against a
  //    bright paper background).
  const grid = detectChartByGrid(grayImage);
  if (!grid) {
    throw new Error(
      'Could not detect the Munsell swatch grid in the image. ' +
        'Ensure the whole chart is visible and framed reasonably square-on.',
    );
  }

  // 3. Compute per-cell sample rectangles in preview coords straight
  //    from the detected grid. cellW/cellH already reflect the actual
  //    swatch spacing in this capture; no homography needed.
  const halfW = grid.cellW * SAMPLE_HALF_W_FRAC;
  const halfH = grid.cellH * SAMPLE_HALF_H_FRAC;
  const scaleX = gray.sourceWidth / gray.width;
  const scaleY = gray.sourceHeight / gray.height;
  const previewRects = MUNSELL_10YR_CELLS.map(cell => {
    const rowIdx = CHART_VALUES.indexOf(cell.value);
    const colIdx = CHART_CHROMAS.indexOf(cell.chroma);
    const {x: cx, y: cy} = grid.centers[rowIdx][colIdx];
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
  const measured = DngDecoderHybrid.decodeDngRois(dngPath, dngRois);

  // 4. Bundle each cell with its raw measurement. Munsell notation
  //    and ΔE come later — the screen recomputes them any time the
  //    user picks a different reference cell.
  const measurements: CellMeasurement[] = MUNSELL_10YR_CELLS.map(
    (cell, idx) => ({cell, rawLinearRgb: measured[idx]}),
  );

  // 5. Colour PNG preview for the validation view.
  const preview = DngDecoderHybrid.renderPreview(dngPath, PREVIEW_MAX_DIM);

  return {
    measurements,
    grid,
    preview,
    previewRects,
    detectedSwatches: grid.detected,
  };
};

// Turn raw per-cell measurements into display-ready cell results,
// optionally after applying a per-channel WB correction that maps the
// reference cell's raw colour onto its expected colour. Same reasoning
// as `getColorFromLinearRgb`: illumination shows up as a per-channel
// scale factor on the decoder output, and dividing it out is the
// simplest first-order correction.
export const computeCellResults = (
  measurements: readonly CellMeasurement[],
  referenceNotation: string | null,
): MunsellCellResult[] => {
  const scale = wbScaleFromReference(measurements, referenceNotation);
  return measurements.map(({cell, rawLinearRgb}) => {
    const measuredLinearRgb = {
      r: rawLinearRgb.r * scale.r,
      g: rawLinearRgb.g * scale.g,
      b: rawLinearRgb.b * scale.b,
    };
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
const wbScaleFromReference = (
  measurements: readonly CellMeasurement[],
  referenceNotation: string | null,
): {r: number; g: number; b: number} => {
  if (referenceNotation == null) return {r: 1, g: 1, b: 1};
  const ref = measurements.find(m => m.cell.notation === referenceNotation);
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
