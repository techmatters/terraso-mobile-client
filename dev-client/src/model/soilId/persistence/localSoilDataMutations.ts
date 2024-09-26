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
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  DEPTH_DEPENDENT_UPDATE_FIELDS,
  DEPTH_INTERVAL_UPDATE_FIELDS,
  soilDataChangeSet,
  SoilDataChangeSet,
  UPDATE_FIELDS,
} from 'terraso-mobile-client/model/soilId/persistence/soilDataChanges';
import {sameDepth} from 'terraso-mobile-client/model/soilId/soilIdFunctions';

export type MutationResult<R, C, E> = {
  result: R;
  changes: C;
  errors: E[];
};

export const updateSoilData = (
  input: SoilDataUpdateMutationInput,
  data: SoilData,
): MutationResult<SoilData, SoilDataChangeSet, any> => {
  const result = {...data};
  const changes = soilDataChangeSet();

  const mutated = mutateFields(UPDATE_FIELDS, input, result);
  if ('depthIntervalPreset' in mutated) {
    result.depthIntervals = [];
  }

  return {
    result,
    changes,
    errors: [],
  };
};

export const deleteSoilDataDepthInterval = (
  input: SoilDataDeleteDepthIntervalMutationInput,
  data: SoilData,
): MutationResult<SoilData, SoilDataChangeSet, any> => {
  const result = {...data};

  const inputDepthFilter = sameDepth(input);
  const depthIntervalIdx = data.depthIntervals.findIndex(candidate =>
    inputDepthFilter(candidate),
  );
  result.depthIntervals.splice(depthIntervalIdx, 1);

  return {
    result,
    changes: soilDataChangeSet(),
    errors: [],
  };
};

export const updateSoilDataDepthInterval = (
  input: SoilDataUpdateDepthIntervalMutationInput,
  data: SoilData,
): MutationResult<SoilData, SoilDataChangeSet, any> => {
  const result = {...data};

  const inputDepthFilter = sameDepth(input);
  const depthInterval = data.depthIntervals.find(candidate =>
    inputDepthFilter(candidate),
  );
  if (depthInterval) {
    mutateFields(DEPTH_INTERVAL_UPDATE_FIELDS, input, depthInterval);
  }

  return {
    result,
    changes: soilDataChangeSet(),
    errors: [],
  };
};

export const updateDepthDependentSoilData = (
  input: DepthDependentSoilDataUpdateMutationInput,
  data: SoilData,
): MutationResult<SoilData, SoilDataChangeSet, any> => {
  const result = {...data};

  const inputDepthFilter = sameDepth(input);
  const depthDependent = data.depthDependentData.find(candidate =>
    inputDepthFilter(candidate),
  );
  if (depthDependent) {
    mutateFields(DEPTH_DEPENDENT_UPDATE_FIELDS, input, depthDependent);
  }

  return {
    result,
    changes: soilDataChangeSet(),
    errors: [],
  };
};

export const mutateFields = (
  fields: string[],
  mutationInput: any,
  mutationTarget: any,
): Record<string, any> => {
  const mutatedFields: Record<string, any> = {};
  for (const field of fields) {
    if (field in mutationInput && mutationInput[field] !== undefined)
      mutatedFields[field] = mutationInput[field];
  }
  Object.assign(mutationTarget, mutatedFields);
  return mutatedFields;
};
