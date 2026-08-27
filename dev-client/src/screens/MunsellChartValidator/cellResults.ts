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

import {labToMunsell, munsellToLab} from 'munsell';
// `munsell`'s index only re-exports a subset of its colorspace helpers.
// Deep-import the two we need — linear-sRGB → XYZ and XYZ → Lab —
// rather than re-implement them here.
import {linearRgbToXyz, xyzToLab} from 'munsell/dist/src/colorspace';

import {
  deltaEFromLab,
  deltaEFromLinearRgb,
} from 'terraso-mobile-client/model/color/deltaE';
import {CHART_HUE} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';
import type {MunsellPageCell} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

// Pure-JS "given raw per-cell measurements, produce display-ready
// results" derivation code — split out of chartAnalysis so it can be
// imported from Node (chartAnalysis pulls in the native DngDecoder
// module at the top level, which Node can't load).

// Raw per-cell measurement — the linear-sRGB the DNG decoder returned
// for the swatch, no WB correction applied. Kept separate from the
// display-ready MunsellCellResult below so the screen can re-apply a
// reference-cell WB correction on demand without re-decoding the DNG.
export type CellMeasurement = {
  cell: MunsellPageCell;
  rawLinearRgb: {r: number; g: number; b: number};
  // Optional companion reducer: median-cut "biggest colour cluster"
  // over the same ROI, matching the legacy JPEG dominantColor path.
  // Populated by chartAnalysis via decoder.decodeDngRoisReduced for
  // the RAW path; null for the photo path (CIImage can't cheaply do
  // per-pixel median-cut). Downstream consumers pick which reducer
  // to feed into WB + Munsell match; the filmstrip's mean-vs-dominant
  // radio flips between them.
  rawLinearRgbDominant?: {r: number; g: number; b: number} | null;
  // Optional pre-clamp linear-sRGB mean. When present, WB-scale
  // computation (wbRgbScaleFromReference / bradfordScaleFromReference)
  // divides by this instead of `rawLinearRgb`, which is critical on
  // bright WB anchors whose post-WB pipeline mean exceeds 1.0 —
  // dividing by the clamped 1.0 under-corrects every chip on the
  // chart. See DngPipeline RoiReduced::meanUnclamped for the source.
  // Null / absent for callers that don't have an unclamped signal
  // (JPEG path, Swift iOS DNG path, older on-device shims); those
  // fall back to `rawLinearRgb`.
  rawLinearRgbUnclamped?: {r: number; g: number; b: number} | null;
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

// Same shape as computeCellResults but for a single arbitrary
// linear-sRGB pair (expected + raw), where the "expected" is a
// known reference colour that isn't a Munsell chip — e.g. a
// physical reference card (18% gray, WhiBal, Post-it) whose
// expected value is a datasheet number, not a Munsell notation.
// Doesn't call munsellToLab (which would throw on a non-Munsell
// notation); everything else — WB correction, Lab conversion, ΔE —
// mirrors computeCellResults exactly.
export const computeArbitraryResult = (
  expectedLinearRgb: {r: number; g: number; b: number},
  rawLinearRgb: {r: number; g: number; b: number},
  ref: CellMeasurement | undefined,
  useBradford: boolean = false,
  // Pre-clamp companion to `rawLinearRgb`; when provided, WB is
  // applied to this instead so bright ref-card samples (whose true
  // R can be 1.3–1.5) aren't gained-up from a clipped 1.0. See
  // CellMeasurement.rawLinearRgbUnclamped.
  rawLinearRgbUnclamped?: {r: number; g: number; b: number} | null,
): {
  measuredLinearRgb: {r: number; g: number; b: number};
  deltaE: number;
} => {
  const measuredLinearRgb = applyWbCorrection(
    rawLinearRgbUnclamped ?? rawLinearRgb,
    ref,
    useBradford,
  );
  const deltaE = deltaEFromLinearRgb(measuredLinearRgb, expectedLinearRgb);
  return {measuredLinearRgb, deltaE};
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
  return measurements.map(({cell, rawLinearRgb, rawLinearRgbUnclamped}) => {
    // Same clamp caveat as wbRgbScaleFromReference: feed the pre-clamp
    // chip raw (when available) into WB so a bright chip whose true
    // R is 1.35 doesn't get its measured value pinned to
    // (gain × 1.0) instead of (gain × 1.35).
    const measuredLinearRgb = applyWbCorrection(
      rawLinearRgbUnclamped ?? rawLinearRgb,
      ref,
      useBradford,
    );
    // measuredLab kept as a local so it can feed both the ΔE call and
    // safeLabToMunsell without re-doing the XYZ+Lab conversion.
    const [X, Y, Z] = linearRgbToXyz(
      measuredLinearRgb.r,
      measuredLinearRgb.g,
      measuredLinearRgb.b,
    );
    const measuredLab = xyzToLab(X, Y, Z);
    const [eL, ea, eb] = munsellToLab(cell.notation);
    const deltaE = deltaEFromLab(
      {L: measuredLab[0], A: measuredLab[1], B: measuredLab[2]},
      {L: eL, A: ea, B: eb},
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
  // Prefer the pre-clamp mean when available. Clamping the divisor
  // silently under-scales the gain on bright anchors: a card whose
  // true post-WB R is 1.35 stored as 1.0 makes the returned gain
  // 0.74× as strong as it should be, biasing every chip on the chart
  // toward the raw camera cast. See CellMeasurement.rawLinearRgbUnclamped.
  const raw = ref.rawLinearRgbUnclamped ?? ref.rawLinearRgb;
  const {r: er, g: eg, b: eb} = ref.cell.expectedLinearRgb;
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
  // Same clamp caveat as wbRgbScaleFromReference — divide by the
  // unclamped mean when available so bright anchors aren't
  // under-corrected.
  const raw = ref.rawLinearRgbUnclamped ?? ref.rawLinearRgb;
  const rawXyz = linearRgbToXyz(raw.r, raw.g, raw.b) as [
    number,
    number,
    number,
  ];
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
