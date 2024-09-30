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
} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {
  DepthDependentUpdateField,
  DepthIntervalUpdateField,
  UpdateField,
} from 'terraso-mobile-client/model/soilId/sync/soilDataFields';
import {FieldChange} from 'terraso-mobile-client/model/sync/syncChanges';

export type SoilDataChanges = {
  fieldChanges: Record<string, FieldChange<UpdateField>>;
  depthIntervalChanges: Record<string, DepthIntervalChange>;
  depthDependentChanges: Record<string, DepthDependentChange>;
};

export const SoilDataChanges = (): SoilDataChanges => {
  return {
    fieldChanges: {},
    depthIntervalChanges: {},
    depthDependentChanges: {},
  };
};

export const getDepthIntervalChanges = (
  changes: SoilDataChanges,
  depthInterval: DepthInterval,
): DepthIntervalChange => {
  const key = depthIntervalKey(depthInterval);
  let depthIntervalChanges = changes.depthIntervalChanges[key];
  if (!depthIntervalChanges) {
    depthIntervalChanges = {
      depthInterval,
      deleted: false,
      fieldChanges: {},
    };
    changes.depthIntervalChanges[key] = depthIntervalChanges;
  }
  return depthIntervalChanges;
};

export const getDepthDependentChanges = (
  changes: SoilDataChanges,
  depthInterval: DepthInterval,
): DepthDependentChange => {
  const key = depthIntervalKey(depthInterval);
  let depthDependentChanges = changes.depthDependentChanges[key];
  if (!depthDependentChanges) {
    depthDependentChanges = {
      depthInterval,
      fieldChanges: {},
    };
    changes.depthDependentChanges[key] = depthDependentChanges;
  }
  return depthDependentChanges;
};

export const recordUpdateFields = (
  changes: SoilDataChanges,
  fieldNames: Iterable<UpdateField>,
) => {
  for (const fieldName of fieldNames) {
    changes.fieldChanges[fieldName] = {fieldName};
  }
};

export const recordDepthIntervalUpdateFields = (
  changes: SoilDataChanges,
  depthInterval: DepthInterval,
  fieldNames: Iterable<DepthIntervalUpdateField>,
) => {
  const depthIntervalChanges = getDepthIntervalChanges(changes, depthInterval);
  for (const fieldName of fieldNames) {
    depthIntervalChanges.fieldChanges[fieldName] = {fieldName};
  }
};

export const recordDepthIntervalDeletion = (
  changes: SoilDataChanges,
  depthInterval: DepthInterval,
) => {
  changes.depthIntervalChanges[depthIntervalKey(depthInterval)] = {
    depthInterval: depthInterval,
    deleted: true,
    fieldChanges: {},
  };
};

export const recordDepthDependentUpdateFields = (
  changes: SoilDataChanges,
  depthInterval: DepthInterval,
  fieldNames: Iterable<DepthDependentUpdateField>,
) => {
  const depthDependentChanges = getDepthDependentChanges(
    changes,
    depthInterval,
  );
  for (const fieldName of fieldNames) {
    depthDependentChanges.fieldChanges[fieldName] = {fieldName};
  }
};

export const unifyChanges = (
  a?: SoilDataChanges,
  b?: SoilDataChanges,
): SoilDataChanges => {
  return {
    fieldChanges: {...a?.fieldChanges, ...b?.fieldChanges},
    depthIntervalChanges: unifyDepthIntervalChanges(
      a?.depthIntervalChanges,
      b?.depthIntervalChanges,
    ),
    depthDependentChanges: unifyDepthDependentDataChanges(
      a?.depthDependentChanges,
      b?.depthDependentChanges,
    ),
  };
};

export const unifyDepthIntervalChanges = (
  a?: Record<string, DepthIntervalChange>,
  b?: Record<string, DepthIntervalChange>,
): Record<string, DepthIntervalChange> => {
  const result = {...a};
  for (const [key, value] of Object.entries(b ?? {})) {
    if (value.deleted) {
      result[key] = value;
    } else {
      result[key] = {
        depthInterval: value.depthInterval,
        deleted: false,
        fieldChanges: {...result[key]?.fieldChanges, ...value.fieldChanges},
      };
    }
  }
  return result;
};

export const unifyDepthDependentDataChanges = (
  a?: Record<string, DepthDependentChange>,
  b?: Record<string, DepthDependentChange>,
): Record<string, DepthDependentChange> => {
  const result = {...a};
  for (const [key, value] of Object.entries(b ?? {})) {
    result[key] = {
      depthInterval: value.depthInterval,
      fieldChanges: {...result[key]?.fieldChanges, ...value.fieldChanges},
    };
  }
  return result;
};

export type DepthIntervalChange = {
  depthInterval: DepthInterval;
  fieldChanges: Record<string, FieldChange<DepthIntervalUpdateField>>;
  deleted: boolean;
};

export type DepthDependentChange = {
  depthInterval: DepthInterval;
  fieldChanges: Record<string, FieldChange<DepthDependentUpdateField>>;
};

export const depthIntervalKey = (depthInterval: DepthInterval): string =>
  `[${depthInterval.start}-${depthInterval.end})`;

export const gatherDepthIntervals = (
  soilData: SoilData,
): Record<string, SoilDataDepthInterval> => {
  const result: Record<string, SoilDataDepthInterval> = {};
  soilData.depthIntervals.forEach(
    depthInterval =>
      (result[depthIntervalKey(depthInterval.depthInterval)] = depthInterval),
  );

  return result;
};

export const gatherDepthDependentData = (
  soilData: SoilData,
): Record<string, DepthDependentSoilData> => {
  const result: Record<string, DepthDependentSoilData> = {};
  soilData.depthDependentData.forEach(
    depthDependentData =>
      (result[depthIntervalKey(depthDependentData.depthInterval)] =
        depthDependentData),
  );

  return result;
};
