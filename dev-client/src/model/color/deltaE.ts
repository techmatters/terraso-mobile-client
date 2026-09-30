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

// Shared perceptual-colour-difference helpers. Every ΔE call site in
// the app (chart-cell scoring, ref-card ranking, soil-colour matching,
// on-screen swatch comparisons) routes through these — same formula,
// same underlying library, one place to change if we ever want to
// migrate off CIE ΔE2000.
//
// Distance metric: **CIE ΔE2000** (a.k.a. CIEDE2000, ΔE₀₀). Computed
// in **CIELAB** space, always. The 2000 formula includes:
//   - a*-scaling (a* stretched near the neutral axis so tiny
//     chromaticity differences in near-greys aren't overweighted)
//   - lightness / chroma / hue weighting functions (S_L, S_C, S_H)
//   - hue-rotation term (R_T) that couples chroma+hue for blues
// See https://en.wikipedia.org/wiki/Color_difference#CIEDE2000 for
// the formula; the `delta-e` npm library implements it directly.
//
// NB: callers still convert their inputs to Lab through whatever path
// makes sense for their colour space (linearRgbToXyz+xyzToLab, or
// the Munsell library's linear→mhvc→lab chain). This module doesn't
// enforce a single Lab-conversion path — sites that use different
// paths produce slightly different Lab coordinates and therefore
// slightly different ΔE, which is intentional (see the individual
// call-site comments). Unifying the Lab conversion path is a
// separate refactor.

import {getDeltaE00, LAB} from 'delta-e';
import {linearRgbToXyz, xyzToLab} from 'munsell/dist/src/colorspace';

// Re-export the delta-e library's Lab shape so callers don't need to
// depend on the library directly.
export type Lab = LAB;

/**
 * CIE ΔE2000 between two Lab points. Thin wrapper around the delta-e
 * library — use when the caller already has Lab-space coordinates
 * (e.g. from `munsellHVCToLAB`, or the custom mhvc-based
 * `linearRgbToLab` in `getColorFromLinearRgb`).
 */
export const deltaEFromLab = (a: Lab, b: Lab): number => getDeltaE00(a, b);

/**
 * CIE ΔE2000 between two linear-sRGB colours. Full pipeline:
 * `linear-sRGB → XYZ_D65 → CIELAB → ΔE2000`. Matches the path used
 * by the chart-validator cell scoring and the on-screen
 * test-swatch comparison cell.
 */
export const deltaEFromLinearRgb = (
  a: {r: number; g: number; b: number},
  b: {r: number; g: number; b: number},
): number => deltaEFromLab(linearRgbToLabXyz(a), linearRgbToLabXyz(b));

// linear-sRGB → CIELAB via the standard XYZ_D65 detour. Kept local
// (not exported) because sites that need Lab conversion should use
// deltaEFromLinearRgb above, or a Lab-space helper. External Lab
// conversions should stay explicit at the call site to keep the
// choice of pipeline visible in review.
const linearRgbToLabXyz = (c: {r: number; g: number; b: number}): Lab => {
  const [X, Y, Z] = linearRgbToXyz(c.r, c.g, c.b);
  const [L, A, B] = xyzToLab(X, Y, Z);
  return {L, A, B};
};
