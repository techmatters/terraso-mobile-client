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

/**
 * Shared domain types for the RAW colour pipeline. These intentionally mirror
 * the `dng-decoder` Nitro module's surface (Roi / LinearRgb / LinearRgbReduced)
 * so the TS layer can talk about ROIs and reduced colours without importing the
 * native module — which keeps this logic unit-testable and lets a non-native
 * analyzer (e.g. the Mac CLI during fixture eval, or a fake in tests) implement
 * the same seam.
 */

/** A region of interest in full-sensor pixel coordinates. */
export type Roi = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** A colour in linear sRGB, channels nominally in [0, 1]. */
export type LinearRgb = {
  r: number;
  g: number;
  b: number;
};

/**
 * The per-ROI reduction the native pipeline produces in a single pass:
 *  - `mean`     — per-channel arithmetic mean in linear sRGB.
 *  - `dominant` — median-cut dominant cluster (shared C++ `MedianCut`).
 *  - `variance` — per-channel variance in linear sRGB (homogeneity signal);
 *                 optional because not every backend surfaces it.
 */
export type RoiReduced = {
  mean: LinearRgb;
  dominant: LinearRgb;
  variance?: LinearRgb;
};

/**
 * Which reduction counts as "the" colour for an ROI. The native pass always
 * yields `mean` and `dominant`; this union is the single place the algorithm
 * choice is named, and is expected to grow (trimmed-mean, clipped-excluded,
 * …) as the native side exposes more fields. See the part-3 algorithm
 * decision in docs/munsell-integration.md.
 */
export type ReducerKind = 'mean' | 'dominant';

export const DEFAULT_REDUCER: ReducerKind = 'dominant';

/**
 * The "get colour from a rectangle" seam. Any backend — the on-device Nitro
 * decoder, iOS CIRAWFilter, or an offline CLI — implements this; callers stay
 * backend-agnostic. Reduces each ROI in one pass so multi-ROI captures
 * (N references + soil) cost a single decode.
 */
export interface RoiColorAnalyzer {
  analyzeRois(rois: Roi[]): Promise<RoiReduced[]>;
}
