/*
 * Copyright © 2024 Technology Matters
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
  DepthDependentSoilData,
  DepthInterval,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS,
  DEPTH_INTERVAL_UPDATE_FIELDS,
  SOIL_DATA_UPDATE_FIELDS,
} from 'terraso-mobile-client/model/soilId/actions/soilDataActionFields';
import {depthIntervalKey} from 'terraso-mobile-client/model/soilId/soilIdFunctions';

export const getChangedSoilDataFields = (
  curr: SoilData,
  prev?: SoilData,
): Partial<SoilData> => {
  return diffFields(SOIL_DATA_UPDATE_FIELDS, curr, prev);
};

export type DepthIntervalChanges<T> = {
  depthInterval: DepthInterval;
  changedFields: Partial<T>;
};

export const getDeletedDepthIntervals = (
  curr: SoilData,
  prev?: SoilData,
): DepthInterval[] => {
  if (!prev) {
    return [];
  }

  const currIntervals = new Set(
    curr.depthIntervals.map(di => depthIntervalKey(di.depthInterval)),
  );
  return prev.depthIntervals
    .filter(di => !currIntervals.has(depthIntervalKey(di.depthInterval)))
    .map(di => di.depthInterval);
};

export const getChangedDepthIntervals = (
  curr: SoilData,
  prev?: SoilData,
): DepthIntervalChanges<SoilDataDepthInterval>[] => {
  const prevIntervals = indexDepthIntervals(prev?.depthIntervals ?? []);
  const diffs = curr.depthIntervals.map(di => {
    return {
      depthInterval: di.depthInterval,
      changedFields: getChangedDepthIntervalFields(
        di,
        prevIntervals[depthIntervalKey(di.depthInterval)],
      ),
    };
  });

  return diffs.filter(di => Object.keys(di.changedFields).length > 0);
};

export const getChangedDepthIntervalFields = (
  curr: SoilDataDepthInterval,
  prev?: SoilDataDepthInterval,
): Partial<SoilDataDepthInterval> => {
  return diffFields(DEPTH_INTERVAL_UPDATE_FIELDS, curr, prev);
};

export const getChangedDepthDependentData = (
  curr: SoilData,
  prev?: SoilData,
): DepthIntervalChanges<DepthDependentSoilData>[] => {
  const prevData = indexDepthIntervals(prev?.depthDependentData ?? []);
  const diffs = curr.depthDependentData.map(dd => {
    return {
      depthInterval: dd.depthInterval,
      changedFields: getChangedDepthDependentFields(
        dd,
        prevData[depthIntervalKey(dd.depthInterval)],
      ),
    };
  });
  return diffs.filter(di => Object.keys(di.changedFields).length > 0);
};

export const getChangedDepthDependentFields = (
  curr: DepthDependentSoilData,
  prev?: DepthDependentSoilData,
): Partial<DepthDependentSoilData> => {
  return diffFields(DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS, curr, prev);
};

export const diffFields = <F extends keyof T, T>(
  fields: F[],
  curr: T,
  prev?: T,
): Partial<T> => {
  let changedFields: (keyof T)[];
  if (!prev) {
    changedFields = fields;
  } else {
    changedFields = fields.filter(field => curr[field] !== prev[field]);
  }

  return Object.fromEntries(
    changedFields.map(field => [field, curr[field]]),
  ) as Partial<T>;
};

export const indexDepthIntervals = <T>(
  items: (T & {depthInterval: DepthInterval})[],
): Record<string, T> =>
  Object.fromEntries(
    items.map(item => [depthIntervalKey(item.depthInterval), item]),
  );
