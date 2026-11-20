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

import {getColorsFromRois} from 'terraso-mobile-client/model/rawColor/colorReducer';
import {
  LinearRgb,
  ReducerKind,
  Roi,
  RoiColorAnalyzer,
} from 'terraso-mobile-client/model/rawColor/types';

/**
 * A known colour reference (e.g. the yellow Post-it, or a future card patch).
 * The analysis is multi-reference from the start: a capture can carry several
 * of these plus the soil sample, so the model never assumes a single card.
 * Whether the set is fixed or user-extendable is a part-5 decision
 * (docs/munsell-integration.md) — this type supports both.
 */
export type ReferenceColor = {
  /** Stable identifier (also used as the ROI assignment key). */
  id: string;
  /** Human-facing label. */
  label: string;
  /** Calibrated expected colour in linear sRGB. */
  expected: LinearRgb;
  /**
   * Where this reference came from. Lets the picker merge builtin and
   * user-calibrated custom references into a single list without
   * special-casing id shapes. Defaults to 'builtin' for backward compat with
   * older callers.
   */
  source?: 'builtin' | 'custom';
  /**
   * Only populated for custom refs — free-form illuminant note the user typed
   * at calibration time (e.g. "kitchen daylight ~4pm cloudy"). Shown in the
   * picker to help testers spot illuminant mismatches.
   */
  calibratedUnder?: string;
  /**
   * Picker UI hint. True for references we know to be unreliable (e.g. the
   * PostIt — convenient but least spectrally neutral). The picker is expected
   * to still offer them, just with a "Not Recommended" affordance.
   */
  notRecommended?: boolean;
};

/** Sentinel id for the soil sample ROI (not a reference). */
export const SOIL_ROI_ID = 'soil';

/** An ROI tagged with which reference (or the soil sample) it covers. */
export type RoiAssignment = {
  id: string;
  roi: Roi;
};

/** A measured colour for one assigned ROI. */
export type MeasuredRoi = {
  id: string;
  roi: Roi;
  measured: LinearRgb;
};

/**
 * Built-in reference set. Values ported from the research branch's
 * `LINEAR_REFERENCES` in `src/model/color/getColorFromLinearRgb.ts`
 * (`feat/munsell-export-squashed`). Linear-sRGB (channels in [0, 1]):
 *  - Post-it canary: srgbToLinear([249.92, 242.07, 161.42]/255) → (0.9542, 0.887, 0.362)
 *  - 18% neutral gray: r=g=b=0.18
 *  - WhiBal G7 (~40% neutral per Michael Tapes / RawWorkflow): r=g=b=0.4
 *  - White printer paper (~85% near-white, per-batch refinement TODO): r=g=b=0.85
 *
 * Order drives the picker's default display order. "Not Recommended" surfaces
 * on the PostIt because it's the least spectrally neutral of the four — useful
 * for continuity with the shipping flow, but a true grey/white card is
 * preferred.
 *
 * User-calibrated custom references are intentionally out of scope for this
 * pass (see docs/color-final-plan.md). The `source` field + a future
 * `listAvailableReferences()` wrapper that concatenates custom entries from
 * MMKV into this list are the extension seams.
 */
export const BUILTIN_REFERENCES: readonly ReferenceColor[] = [
  {
    id: 'POST_IT_YELLOW',
    label: '3M Post-it Yellow (canary)',
    expected: {r: 0.9542, g: 0.887, b: 0.362},
    source: 'builtin',
    notRecommended: true,
  },
  {
    id: 'GRAY_CARD_18PCT',
    label: '18% Neutral Gray Card',
    expected: {r: 0.18, g: 0.18, b: 0.18},
    source: 'builtin',
  },
  {
    id: 'WHIBAL_G7',
    label: 'WhiBal G7 (Certified Neutral)',
    expected: {r: 0.4, g: 0.4, b: 0.4},
    source: 'builtin',
  },
  {
    id: 'WHITE_PAPER',
    label: 'White Printer Paper',
    expected: {r: 0.85, g: 0.85, b: 0.85},
    source: 'builtin',
  },
];

/**
 * Returns the union of builtin and custom references that are offered in the
 * picker. Today returns the builtins only; the signature is the extension
 * point for the future custom-refs feature (see docs/color-final-plan.md).
 * Order: builtins in the BUILTIN_REFERENCES order, then customs by creation.
 */
export const listAvailableReferences = (): readonly ReferenceColor[] =>
  BUILTIN_REFERENCES;

export const findReference = (
  id: string,
  references: readonly ReferenceColor[] = BUILTIN_REFERENCES,
): ReferenceColor | undefined => references.find(r => r.id === id);

/**
 * Decode every assigned ROI in a single pass and return the measured colour
 * for each (order preserved, ids echoed). Works for any number of references
 * plus the soil ROI.
 */
export const analyzeRoiAssignments = async (
  analyzer: RoiColorAnalyzer,
  assignments: RoiAssignment[],
  kind: ReducerKind,
): Promise<MeasuredRoi[]> => {
  const colors = await getColorsFromRois(
    analyzer,
    assignments.map(a => a.roi),
    kind,
  );
  return assignments.map((a, i) => ({
    id: a.id,
    roi: a.roi,
    measured: colors[i],
  }));
};

/** Pull the single soil measurement out of a set of results, if present. */
export const soilMeasurement = (
  measured: MeasuredRoi[],
): MeasuredRoi | undefined => measured.find(m => m.id === SOIL_ROI_ID);

/** The reference measurements (everything that isn't the soil ROI). */
export const referenceMeasurements = (measured: MeasuredRoi[]): MeasuredRoi[] =>
  measured.filter(m => m.id !== SOIL_ROI_ID);
