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

import {getDeltaE00} from 'delta-e';
import {mhvcToLab, rgb255ToMhvc} from 'munsell';

import {
  linearToSrgb,
  munsellDistance,
  nearestSoilColor,
  SOIL_COLOR_MATCH_THRESHOLD,
} from 'terraso-mobile-client/model/color/colorDetection';
import {ColorResult} from 'terraso-mobile-client/model/color/types';

// Ground-truth linear-sRGB values for known reference cards. Derived by
// linearizing the gamma-encoded sRGB triples the JPEG pipeline uses (in
// colorDetection.ts REFERENCES), so results should be directly
// comparable between the two paths on a matched capture.
export type LinearRgb = {r: number; g: number; b: number};

export const LINEAR_REFERENCES = {
  // 3M Canary-yellow Post-it. srgbToLinear([249.92, 242.07, 161.42]/255)
  // rounded. The RAW pipeline uses this directly; the JPEG pipeline
  // linearizes REFERENCES.CANARY_POST_IT at correction time.
  POST_IT_YELLOW: {r: 0.9542, g: 0.887, b: 0.362},
  // 3M Pastel-yellow Post-it (Pastel Collection). Nominal sRGB #FFF9BF
  // = (255, 249, 191), linearized via the standard sRGB EOTF. Much
  // paler and less saturated than the canary yellow. Small chroma
  // difference matters — a canary-calibrated WB applied to a pastel
  // sample pushes results warm/orange.
  POST_IT_PASTEL_YELLOW: {r: 1.0, g: 0.947, b: 0.521},
  // Generic 18% neutral gray card — the classic photographic reference,
  // ~18% reflectance across the visible spectrum, spectrally flat.
  // In linear-sRGB that's r = g = b = 0.18. PLACEHOLDER: measure your
  // actual card once you have one physically on hand; small deviations
  // from neutral (both in luminance and in per-channel balance) matter
  // for the WB correction. Common candidate cards to measure against:
  // X-Rite ColorChecker gray patch (~0.18 nominal), Kodak Q-13 Gray
  // Scale square M, or a Sekonic gray card.
  GRAY_CARD_18PCT: {r: 0.18, g: 0.18, b: 0.18},
} as const satisfies Record<string, LinearRgb>;

export type LinearReferenceKey = keyof typeof LINEAR_REFERENCES;

// Human-facing labels for each reference — shown in the picker UI when
// the user is choosing which reference their captured card is.
export const LINEAR_REFERENCE_NAMES: Record<LinearReferenceKey, string> = {
  POST_IT_YELLOW: '3M Post-it Yellow (canary)',
  POST_IT_PASTEL_YELLOW: '3M Post-it Yellow (pastel)',
  GRAY_CARD_18PCT: '18% Neutral Gray Card',
};

// Ordered list version of LINEAR_REFERENCES for the confidence-picker
// UI. Keep in sync with LINEAR_REFERENCES.
export const LINEAR_REFERENCE_KEYS: LinearReferenceKey[] = [
  'POST_IT_YELLOW',
  'POST_IT_PASTEL_YELLOW',
  'GRAY_CARD_18PCT',
];

// Common shape for anything that acts as a reference in the picker —
// covers both compile-time-known LINEAR_REFERENCES entries and user-
// calibrated custom entries from customReferences.ts. Structural so
// getColorFromLinearRgb.ts doesn't need to import customReferences
// (avoids a cycle with the reverse LinearRgb import).
export type AvailableReference = {
  // Namespaced so builtin + custom IDs can never collide.
  id: string;
  name: string;
  linearRgb: LinearRgb;
  source: 'builtin' | 'custom';
  // Only populated for custom refs — the free-form illuminant note the
  // user typed at calibration time. Shown next to custom refs in the
  // picker so testers can spot illuminant mismatches at a glance.
  calibratedUnder?: string;
};

export type RankedReference = AvailableReference & {
  /**
   * CIE ΔE00 between the measured card and this reference's expected
   * color, both converted through Munsell HVC into LAB. Lower = closer
   * match. Reference implementations of ΔE00 give "just noticeable
   * difference" around 1.0; anything under ~10 is a plausible match,
   * over ~40 is clearly a different color.
   *
   * See phase 6 TODO in docs/raw-camera-plan.md — this weighting is a
   * placeholder; a chromaticity-weighted variant is planned once the
   * calibrated library grows past a couple of entries.
   */
  deltaE: number;
  /**
   * `1 - deltaE/40` clamped to [0, 1]. Purely a display convenience —
   * the ranking is by deltaE.
   */
  confidence: number;
};

// Convert a linear-sRGB triple to LAB via gamma-encoded sRGB255 →
// Munsell HVC → LAB. Uses the two chained conversions the munsell
// package exposes; not the most direct sRGB→LAB path but it lands on
// the same coordinate system used everywhere else in this file.
const linearRgbToLab = (rgb: LinearRgb): {L: number; A: number; B: number} => {
  const hvc = rgb255ToMhvc(
    linearToSrgb(rgb.r),
    linearToSrgb(rgb.g),
    linearToSrgb(rgb.b),
  );
  const [L, A, B] = mhvcToLab(...hvc);
  return {L, A, B};
};

// Structural subset of CustomReference from customReferences.ts —
// declared here to avoid the cycle that would come from importing
// CustomReference (which itself imports LinearRgb from this file).
type CustomRefLike = {
  id: string;
  name: string;
  linearRgb: LinearRgb;
  calibratedUnder?: string;
};

// Union of predefined + custom references in a shape suitable for
// both the picker (RAW analysis) and the calibrate-screen dropdown.
export const listAvailableReferences = (
  customRefs: readonly CustomRefLike[] = [],
): AvailableReference[] => [
  ...LINEAR_REFERENCE_KEYS.map(
    (key): AvailableReference => ({
      id: `builtin:${key}`,
      name: LINEAR_REFERENCE_NAMES[key],
      linearRgb: LINEAR_REFERENCES[key],
      source: 'builtin',
    }),
  ),
  ...customRefs.map(
    (r): AvailableReference => ({
      id: `custom:${r.id}`,
      name: r.name,
      linearRgb: r.linearRgb,
      source: 'custom',
      calibratedUnder: r.calibratedUnder,
    }),
  ),
];

// Score every available reference (predefined + custom) against the
// measured card, sorted best-first. Used by the picker UI: after the
// user selects the reference ROI, we don't know which physical card
// they framed — so we present them a ranked list with a top pick
// auto-selected.
export const rankReferences = (
  measuredCard: LinearRgb,
  customRefs: readonly CustomRefLike[] = [],
): RankedReference[] => {
  const measuredLab = linearRgbToLab(measuredCard);
  const ranked = listAvailableReferences(customRefs).map(
    (ref): RankedReference => {
      const expectedLab = linearRgbToLab(ref.linearRgb);
      const deltaE = getDeltaE00(measuredLab, expectedLab);
      return {
        ...ref,
        deltaE,
        confidence: Math.max(0, Math.min(1, 1 - deltaE / 40)),
      };
    },
  );
  ranked.sort((a, b) => a.deltaE - b.deltaE);
  return ranked;
};

// The RAW-path counterpart to getColorFromPixels. Same algorithmic shape,
// just done end-to-end in linear-sRGB space:
//
//   1. `card` and `sample` arrive as linear-sRGB triples from the DNG
//      decoder (which already applied AsShotNeutral WB and ColorMatrix1
//      inside the C++ / CIRAWFilter pipeline).
//   2. Compute a per-channel gain that maps the measured reference-card
//      color onto the known-true reference color (`expected`). This
//      is the classic von-Kries WB correction — physically correct in
//      linear-light space, unlike the gamma-space version used by the
//      pre-linear-fix JPEG pipeline.
//   3. Apply that gain to the sample. Result is the sample "as it would
//      look under the illumination the reference card was calibrated
//      under" — approximately D65 for our references.
//   4. Convert to gamma-encoded sRGB 0-255, feed to Munsell match.
//
// Guards against a fully-black card (any zero channel → return that
// channel as zero rather than divide-by-zero).
export const getColorFromLinearRgb = (
  card: LinearRgb,
  sample: LinearRgb,
  expected: LinearRgb,
): ColorResult => {
  const correctedR = card.r > 0 ? (expected.r / card.r) * sample.r : 0;
  const correctedG = card.g > 0 ? (expected.g / card.g) * sample.g : 0;
  const correctedB = card.b > 0 ? (expected.b / card.b) * sample.b : 0;

  const srgb255: [number, number, number] = [
    linearToSrgb(correctedR),
    linearToSrgb(correctedG),
    linearToSrgb(correctedB),
  ];

  const predicted = rgb255ToMhvc(...srgb255);
  const nearest = nearestSoilColor(predicted);
  const nearestResult = {
    colorHue: nearest[0],
    colorValue: nearest[1],
    colorChroma: nearest[2],
  };

  if (munsellDistance(nearest, predicted) < SOIL_COLOR_MATCH_THRESHOLD) {
    return {result: nearestResult};
  }
  return {
    nearestValidResult: nearestResult,
    invalidResult: {
      colorHue: predicted[0],
      colorValue: predicted[1],
      colorChroma: predicted[2],
    },
  };
};

// Phase-6 calibration helper. Given a scene containing one already-
// calibrated reference (`knownMeasured` = ROI-averaged linear-sRGB
// under the current illumination, `knownExpected` = its stored linear-
// sRGB) and one new uncalibrated card (`newMeasured`), return the
// linear-sRGB that new card should be stored as. Same per-channel gain
// as getColorFromLinearRgb, but keeps the corrected value in linear
// space rather than pushing it through Munsell match.
export const computeCalibratedReference = (
  knownMeasured: LinearRgb,
  knownExpected: LinearRgb,
  newMeasured: LinearRgb,
): LinearRgb => {
  const gainR = knownMeasured.r > 0 ? knownExpected.r / knownMeasured.r : 0;
  const gainG = knownMeasured.g > 0 ? knownExpected.g / knownMeasured.g : 0;
  const gainB = knownMeasured.b > 0 ? knownExpected.b / knownMeasured.b : 0;
  return {
    r: gainR * newMeasured.r,
    g: gainG * newMeasured.g,
    b: gainB * newMeasured.b,
  };
};
