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
export const computeCellResults = (
  measurements: readonly CellMeasurement[],
  referenceNotation: string | null,
  useBradford: boolean = false,
): MunsellCellResult[] => {
  const ref =
    referenceNotation != null
      ? measurements.find(m => m.cell.notation === referenceNotation)
      : undefined;
  const rgbScale = wbRgbScaleFromReference(ref);
  const bfdScale = useBradford ? bradfordScaleFromReference(ref) : null;
  return measurements.map(({cell, rawLinearRgb}) => {
    const measuredLinearRgb = bfdScale
      ? bradfordAdapt(rawLinearRgb, bfdScale)
      : {
          r: rawLinearRgb.r * rgbScale.r,
          g: rawLinearRgb.g * rgbScale.g,
          b: rawLinearRgb.b * rgbScale.b,
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
