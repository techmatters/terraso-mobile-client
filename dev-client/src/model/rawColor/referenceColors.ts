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
  /**
   * Calibrated expected colour in linear sRGB. Populated from the reference
   * calibration flow (part 5). NOTE: the built-in values are not yet ported
   * from the research branch — see BUILTIN_REFERENCES.
   */
  expected: LinearRgb;
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
 * Built-in reference set. Empty until the calibrated values are ported from
 * the research branch (scripts/calibrate-ref-card.mjs + docs/postit-yellow.md);
 * tracked under part 5. The model and analysis below are complete and tested
 * independently of the data.
 */
export const BUILTIN_REFERENCES: readonly ReferenceColor[] = [];

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
