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

import {
  LinearRgb,
  ReducerKind,
  Roi,
  RoiColorAnalyzer,
  RoiReduced,
} from 'terraso-mobile-client/model/rawColor/types';

/**
 * The single decision point for which reduction becomes "the" colour of an
 * ROI. Keeping this one function means the part-3 algorithm choice
 * (primary/dominant vs average vs …) is a one-line swap, shared by every
 * caller and every backend.
 */
export const selectColor = (
  reduced: RoiReduced,
  kind: ReducerKind,
): LinearRgb => {
  switch (kind) {
    case 'mean':
      return reduced.mean;
    case 'dominant':
      return reduced.dominant;
  }
};

/**
 * Convenience over {@link RoiColorAnalyzer}: reduce a single rectangle and
 * apply the chosen reducer. This is the ergonomic "get colour from rectangle"
 * entry point; batch callers should use {@link getColorsFromRois} to decode
 * all ROIs in one pass.
 */
export const getColorFromRoi = async (
  analyzer: RoiColorAnalyzer,
  roi: Roi,
  kind: ReducerKind,
): Promise<LinearRgb> => {
  const [reduced] = await analyzer.analyzeRois([roi]);
  return selectColor(reduced, kind);
};

/**
 * Reduce many rectangles in a single decode pass (one DNG read for N
 * references + soil), then apply the chosen reducer to each. Order matches the
 * input ROIs.
 */
export const getColorsFromRois = async (
  analyzer: RoiColorAnalyzer,
  rois: Roi[],
  kind: ReducerKind,
): Promise<LinearRgb[]> => {
  const reduced = await analyzer.analyzeRois(rois);
  return reduced.map(r => selectColor(r, kind));
};
