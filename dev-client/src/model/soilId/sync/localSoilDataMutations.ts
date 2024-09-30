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
  DepthDependentSoilDataUpdateMutationInput,
  DepthInterval,
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  compareInterval,
  sameDepth,
} from 'terraso-mobile-client/model/soilId/soilIdFunctions';
import {
  recordDepthIntervalDeletion,
  recordDepthIntervalUpdateFields,
  recordUpdateFields,
  SoilDataChanges,
} from 'terraso-mobile-client/model/soilId/sync/soilDataChanges';
import {
  DEPTH_DEPENDENT_UPDATE_FIELDS,
  DEPTH_INTERVAL_UPDATE_FIELDS,
  UPDATE_FIELDS,
} from 'terraso-mobile-client/model/soilId/sync/soilDataFields';
import {mutateFields} from 'terraso-mobile-client/model/sync/syncChanges';

export type MutationResult<R, C> = {
  result: R;
  changes: C;
};

export const updateSoilData = (
  input: SoilDataUpdateMutationInput,
  data: SoilData | undefined,
): MutationResult<SoilData, SoilDataChanges> => {
  const {result, changes} = initializeResult(data);

  const mutated = mutateFields(UPDATE_FIELDS, input, result);
  recordUpdateFields(changes, mutated);

  if (mutated.has('depthIntervalPreset')) {
    for (const depthInterval of result.depthIntervals) {
      recordDepthIntervalDeletion(changes, depthInterval.depthInterval);
    }
    result.depthIntervals = [];
  }

  finalizeResult(result);
  return {
    result,
    changes,
  };
};

export const deleteSoilDataDepthInterval = (
  input: SoilDataDeleteDepthIntervalMutationInput,
  data: SoilData | undefined,
): MutationResult<SoilData, SoilDataChanges> => {
  const {result, changes} = initializeResult(data);

  const inputDepthFilter = sameDepth(input);
  const depthIntervalIdx = result.depthIntervals.findIndex(candidate =>
    inputDepthFilter(candidate),
  );
  result.depthIntervals.splice(depthIntervalIdx, 1);
  recordDepthIntervalDeletion(changes, input.depthInterval);

  finalizeResult(result);
  return {
    result,
    changes,
  };
};

export const updateSoilDataDepthInterval = (
  input: SoilDataUpdateDepthIntervalMutationInput,
  data: SoilData | undefined,
): MutationResult<SoilData, SoilDataChanges> => {
  const {result, changes} = initializeResult(data);

  /* NOTE: apply-to intervals is currently an n^2 traversal! */
  recordOrUpdateDepthInterval(result, changes, input.depthInterval, input);
  if (input.applyToIntervals) {
    for (const depthInterval of input.applyToIntervals) {
      recordOrUpdateDepthInterval(result, changes, depthInterval, input);
    }
  }
  finalizeResult(result);

  return {
    result,
    changes,
  };
};

const recordOrUpdateDepthInterval = (
  result: SoilData,
  changes: SoilDataChanges,
  target: DepthInterval,
  input: SoilDataUpdateDepthIntervalMutationInput,
) => {
  const inputDepthFilter = sameDepth({depthInterval: target});
  let depthInterval = result.depthIntervals.find(inputDepthFilter);
  if (!depthInterval) {
    result.depthIntervals.push(
      (depthInterval = {
        label: input.label ?? '' /* Default from backend */,
        depthInterval: target,
      }),
    );
    recordDepthIntervalUpdateFields(changes, target, ['label']);
  }

  const mutated = mutateFields(
    DEPTH_INTERVAL_UPDATE_FIELDS,
    input,
    depthInterval,
  );
  recordDepthIntervalUpdateFields(changes, target, mutated);
};

export const updateDepthDependentSoilData = (
  input: DepthDependentSoilDataUpdateMutationInput,
  data: SoilData | undefined,
): MutationResult<SoilData, SoilDataChanges> => {
  const {result, changes} = initializeResult(data);

  const inputDepthFilter = sameDepth(input);
  let depthDependentData = result.depthDependentData.find(inputDepthFilter);
  if (!depthDependentData) {
    result.depthDependentData.push(
      (depthDependentData = {
        depthInterval: input.depthInterval,
      }),
    );
  }
  mutateFields(DEPTH_DEPENDENT_UPDATE_FIELDS, input, depthDependentData);

  finalizeResult(result);
  return {
    result,
    changes,
  };
};

export const initializeResult = (
  data: SoilData | undefined,
): {result: SoilData; changes: SoilDataChanges} => {
  const changes = SoilDataChanges();
  if (data) {
    return {result: {...data}, changes};
  } else {
    recordUpdateFields(changes, ['depthIntervalPreset']);
    return {
      result: {
        depthIntervalPreset: 'NRCS' /* Default from backend */,
        depthIntervals: [],
        depthDependentData: [],
      },
      changes,
    };
  }
};

export const finalizeResult = (result: SoilData) => {
  result.depthIntervals.sort(compareInterval);
  result.depthDependentData.sort(compareInterval);
};
