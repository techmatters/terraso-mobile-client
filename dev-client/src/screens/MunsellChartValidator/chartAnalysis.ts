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
  CHART_HUE,
  MUNSELL_10YR_CELLS,
  SWATCH_SAMPLE_HALF_U,
  SWATCH_SAMPLE_HALF_V,
  type MunsellChartCell,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';
import {
  applyHomography,
  computeHomography,
  detectChartCorners,
  type ChartCorners,
  type Homography,
} from 'terraso-mobile-client/screens/MunsellChartValidator/registration';

// End-to-end Munsell chart analysis: takes a captured DNG file,
// auto-registers the chart, decodes every swatch via the RAW pipeline,
// and returns measured vs. expected per cell.
//
// Split into named steps so the UI can surface intermediate failures
// (couldn't find chart / couldn't decode / etc) instead of dumping a
// stack trace on the user.

const PREVIEW_MAX_DIM = 1200;

export type MunsellCellResult = {
  cell: MunsellChartCell;
  measuredLinearRgb: {r: number; g: number; b: number};
  // Munsell notation the algorithm assigns to the measured colour.
  // Format matches munsellToRgb inputs (e.g. "10YR 5/4").
  measuredMunsell: string;
  // ΔE (CIE ΔE2000) between measured and expected colour, both
  // converted through the same Lab pipeline. 0 = perfect, ~1 = just
  // noticeable, > ~10 = clearly different.
  deltaE: number;
};

export type MunsellChartResult = {
  corners: ChartCorners;
  cells: MunsellCellResult[];
  // Preview PNG for the "did the auto-registration land on the right
  // pixels?" validation view. Rendered from the same DNG at the same
  // maxDim so the previewRects below index into its pixel space
  // directly.
  preview: {uri: string; width: number; height: number};
  // Per-cell sampling rectangle in preview-space pixels. Same length
  // as `cells`. Rendered as red-outlined overlays on top of the
  // preview image so the tester can visually confirm each rect lands
  // on the correct swatch (not on a cutout or the white gap).
  previewRects: {x: number; y: number; w: number; h: number}[];
};

export const analyzeMunsellChart = async (
  dngPath: string,
): Promise<MunsellChartResult> => {
  // 1. Auto-registration on a downsampled grayscale render.
  const gray = DngDecoderHybrid.readPreviewGrayscale(dngPath, PREVIEW_MAX_DIM);
  const grayImage = {
    width: gray.width,
    height: gray.height,
    pixels: new Uint8Array(gray.pixels),
  };
  const corners = detectChartCorners(grayImage);
  if (!corners) {
    throw new Error(
      'Could not auto-detect chart in image. Ensure the whole chart is visible with a darker background.',
    );
  }

  // 2. Build homography from chart-normalized to image pixel coords.
  // The preview is at PREVIEW_MAX_DIM long-edge scale; the DNG decoder
  // works in the same coordinate space (CIRAWFilter's extent is
  // orientation-aware and matches renderPreview's output). So the
  // corners in preview-pixel coords can be scaled up to DNG-pixel
  // coords by the ratio dng.dim / preview.dim — but we don't need
  // that scaling since decodeDngRois' coord space matches
  // renderPreview's exactly (see comments in RawColorAnalysisScreen).
  //
  // TL;DR: corners are in *preview* coords → homography maps into
  // preview coords → we then scale sampling rects into DNG coords for
  // decodeDngRois below.
  const H = computeHomography(corners);

  // 3. For each cell, compute a preview-space sampling rect, scale up
  // to CIRAWFilter's full-res coord space (which is what decodeDngRois
  // works in — see HybridDngDecoder.swift decodeDngRois), and batch
  // into one decodeDngRois call.
  const scaleX = gray.sourceWidth / gray.width;
  const scaleY = gray.sourceHeight / gray.height;
  const previewRectsRaw = MUNSELL_10YR_CELLS.map(cell =>
    sampleRectForCell(cell, H),
  );
  const previewRects = previewRectsRaw.map(r => ({
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.w),
    h: Math.round(r.h),
  }));
  const dngRois = previewRectsRaw.map(r => ({
    x: Math.round(r.x * scaleX),
    y: Math.round(r.y * scaleY),
    w: Math.round(r.w * scaleX),
    h: Math.round(r.h * scaleY),
  }));
  const measured = DngDecoderHybrid.decodeDngRois(dngPath, dngRois);

  // 4. Turn each measurement into (Munsell notation + ΔE vs expected).
  const cells: MunsellCellResult[] = MUNSELL_10YR_CELLS.map((cell, idx) => {
    const measuredLinearRgb = measured[idx];
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

  // 5. Render a colour PNG preview at the same maxDim so the
  // validation view can display it. Cheap extra decode; this is a
  // dev/testing tool, not a hot path.
  const preview = DngDecoderHybrid.renderPreview(dngPath, PREVIEW_MAX_DIM);

  return {corners, cells, preview, previewRects};
};

// Compute the preview-pixel rect to sample for a given chart cell.
// Sampling window is a fraction of the cell centred on the swatch's
// nominal centre — see SWATCH_SAMPLE_HALF_* in the chart template.
const sampleRectForCell = (
  cell: MunsellChartCell,
  H: Homography,
): {x: number; y: number; w: number; h: number} => {
  // Corners of the sampling window in chart-normalized coords.
  const u0 = cell.u - SWATCH_SAMPLE_HALF_U;
  const u1 = cell.u + SWATCH_SAMPLE_HALF_U;
  const v0 = cell.v - SWATCH_SAMPLE_HALF_V;
  const v1 = cell.v + SWATCH_SAMPLE_HALF_V;
  // Project all 4 corners into image pixel space, then take the
  // axis-aligned bounding box. Under a mild perspective transform
  // this is close to the true window (any distortion is well under
  // the middle-1/4 tolerance).
  const p00 = applyHomography(H, u0, v0);
  const p10 = applyHomography(H, u1, v0);
  const p01 = applyHomography(H, u0, v1);
  const p11 = applyHomography(H, u1, v1);
  const minX = Math.min(p00.x, p10.x, p01.x, p11.x);
  const maxX = Math.max(p00.x, p10.x, p01.x, p11.x);
  const minY = Math.min(p00.y, p10.y, p01.y, p11.y);
  const maxY = Math.max(p00.y, p10.y, p01.y, p11.y);
  return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
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
