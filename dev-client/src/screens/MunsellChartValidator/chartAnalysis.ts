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
  detectChartByRegions,
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
  // Raw linear-sRGB per SAMPLE_GRID position (8 rows × 6 cols = 48),
  // sampled from the DNG via matchedSampleRects. Same ordering as
  // SAMPLE_GRID / matchedSampleRects. Null if the RANSAC match
  // step didn't run. Not yet mapped to Munsell notations — that
  // mapping is the next step.
  matchedSampleValues: {r: number; g: number; b: number}[] | null;
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

  // 2. Region-growing chart detection. Grows uniform-brightness
  //    regions from every pixel; dark swatches and bright holes
  //    both surface as their own regions and are used together as
  //    grid anchors. No global brightness threshold — adapts to
  //    whatever lighting the capture has.
  const grid = detectChartByRegions(grayImage);
  if (!grid) {
    throw new Error(
      'Could not detect the Munsell chart in the image. ' +
        'Ensure the whole chart is visible and reasonably square-on.',
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
    matchedSampleValues = DngDecoderHybrid.decodeDngRois(
      dngPath,
      sampleDngRois,
    );
  }

  return {
    measurements,
    grid,
    preview,
    previewRects,
    detectedSwatches: grid.detected,
    matchedSampleValues,
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

// Dev export: one row per swatch, with the same Munsell / ΔE the
// on-screen grid shows plus BT.709 full-range 8-bit YCbCr for both the
// expected and measured colour. Each side is emitted twice — once
// straight from linear-sRGB (scene-referred), once from
// gamma-encoded sRGB (display-referred, what a camera pipeline
// typically outputs). Tester picks which one is meaningful for the
// question they're asking.
//
// BT.709 luma weights + full-range 8-bit for both variants. Matches
// the "Rec709-ish 0..255 luma" note in DngDecoder.nitro.ts and the
// frame-analyzer, so numbers line up with ImageAnalysis Y-plane bytes
// elsewhere in the app.
export const csvFromCells = (
  cells: readonly MunsellCellResult[],
  referenceNotation: string | null,
): string => {
  const header = [
    'notation_expected',
    'notation_measured',
    'delta_e',
    'y_lin_expected',
    'cb_lin_expected',
    'cr_lin_expected',
    'y_srgb_expected',
    'cb_srgb_expected',
    'cr_srgb_expected',
    'y_lin_measured',
    'cb_lin_measured',
    'cr_lin_measured',
    'y_srgb_measured',
    'cb_srgb_measured',
    'cr_srgb_measured',
    'is_reference',
  ].join(',');
  const rows = cells.map(c => {
    const ex = linearRgbToYCbCrPair(c.cell.expectedLinearRgb);
    const me = linearRgbToYCbCrPair(c.measuredLinearRgb);
    return [
      csvQuote(c.cell.notation),
      csvQuote(c.measuredMunsell),
      c.deltaE.toFixed(2),
      ex.linear.y,
      ex.linear.cb,
      ex.linear.cr,
      ex.srgb.y,
      ex.srgb.cb,
      ex.srgb.cr,
      me.linear.y,
      me.linear.cb,
      me.linear.cr,
      me.srgb.y,
      me.srgb.cb,
      me.srgb.cr,
      c.cell.notation === referenceNotation ? 'true' : 'false',
    ].join(',');
  });
  return [header, ...rows].join('\n') + '\n';
};

const csvQuote = (s: string) => `"${s.replace(/"/g, '""')}"`;

type YCbCr = {y: number; cb: number; cr: number};

// Both linear- and sRGB-encoded YCbCr for the same linear-RGB input.
// Same BT.709 weights + full-range 8-bit scaling on both; the only
// difference is whether the sRGB gamma curve is applied first.
// Unclamped — over-range measurements (post-WB scaling) can produce
// Y > 255 or Cb/Cr outside [0, 255], and the CSV keeps those visible
// rather than clipping them silently.
const linearRgbToYCbCrPair = (rgb: {
  r: number;
  g: number;
  b: number;
}): {linear: YCbCr; srgb: YCbCr} => ({
  linear: rgbToYCbCr(rgb.r, rgb.g, rgb.b),
  srgb: rgbToYCbCr(
    linearToSrgb(rgb.r),
    linearToSrgb(rgb.g),
    linearToSrgb(rgb.b),
  ),
});

const rgbToYCbCr = (r: number, g: number, b: number): YCbCr => {
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const cb = (b - y) / 1.8556;
  const cr = (r - y) / 1.5748;
  return {
    y: Math.round(y * 255),
    cb: Math.round(cb * 255 + 128),
    cr: Math.round(cr * 255 + 128),
  };
};

// Standard sRGB piecewise gamma. Negative inputs fall through the
// linear branch (12.92 * x), avoiding NaN from Math.pow on negatives.
const linearToSrgb = (x: number): number => {
  if (x <= 0.0031308) return 12.92 * x;
  return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
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
