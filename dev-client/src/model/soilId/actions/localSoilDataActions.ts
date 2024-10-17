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

import {cloneDeep} from 'lodash';

import {
  DepthDependentSoilDataUpdateMutationInput,
  DepthInterval,
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS,
  DEPTH_INTERVAL_UPDATE_FIELDS,
  SOIL_DATA_UPDATE_FIELDS,
} from 'terraso-mobile-client/model/soilId/actions/soilDataActionFields';
import {DEFAULT_DEPTH_INTERVAL_PRESET} from 'terraso-mobile-client/model/soilId/soilDataConstants';
import {
  compareInterval,
  sameDepth,
} from 'terraso-mobile-client/model/soilId/soilIdFunctions';

/*
 * Logic ported from `apps/soil_id/graphql/soil_data.py` in backend project
 */

export const updateSoilData = (
  input: SoilDataUpdateMutationInput,
  data?: SoilData,
): SoilData => {
  const result = initializeResult(data);
  updateFields(input, result, SOIL_DATA_UPDATE_FIELDS);

  /* Specifying a depth interval preset clears all existing depth intervals */
  if (
    input.depthIntervalPreset !== undefined &&
    input.depthIntervalPreset !== data?.depthIntervalPreset
  ) {
    result.depthIntervals = [];
  }

  return result;
};

export const deleteSoilDataDepthInterval = (
  input: SoilDataDeleteDepthIntervalMutationInput,
  data?: SoilData,
): SoilData => {
  if (!data) {
    throw new Error('Soil data not found');
  }

  const result = initializeResult(data);
  const removeIdx = result.depthIntervals.findIndex(sameDepth(input));
  if (removeIdx >= 0) {
    result.depthIntervals.splice(removeIdx, 1);
  } else {
    throw new Error('Depth interval not found');
  }

  return result;
};

export const updateSoilDataDepthInterval = (
  input: SoilDataUpdateDepthIntervalMutationInput,
  data?: SoilData,
): SoilData => {
  const result = initializeResult(data);
  createOrUpdateDepthInterval(input.depthInterval, input, result);
  if (input.applyToIntervals) {
    /* apply-to-intervals excludes the label from the input */
    const applyToIntervalsInput = {...input};
    applyToIntervalsInput.label = undefined;
    for (const interval of input.applyToIntervals) {
      createOrUpdateDepthInterval(interval, applyToIntervalsInput, result);
    }
  }
  result.depthIntervals.sort(compareInterval);

  return result;
};

const createOrUpdateDepthInterval = (
  interval: DepthInterval,
  input: SoilDataUpdateDepthIntervalMutationInput,
  result: SoilData,
) => {
  let depthInterval = result.depthIntervals.find(
    sameDepth({depthInterval: interval}),
  );
  if (!depthInterval) {
    depthInterval = {
      depthInterval: interval,
      label: input.label ?? '',
    };
    result.depthIntervals.push(depthInterval);
  }
  updateFields(input, depthInterval, DEPTH_INTERVAL_UPDATE_FIELDS);
};

export const updateDepthDependentSoilData = (
  input: DepthDependentSoilDataUpdateMutationInput,
  data?: SoilData,
): SoilData => {
  const result = initializeResult(data);
  let depthDependentData = result.depthDependentData.find(
    sameDepth({depthInterval: input.depthInterval}),
  );
  if (!depthDependentData) {
    depthDependentData = {
      depthInterval: input.depthInterval,
    };
    result.depthDependentData.push(depthDependentData);
  }
  updateFields(
    input,
    depthDependentData,
    DEPTH_DEPENDENT_SOIL_DATA_UPDATE_FIELDS,
  );
  result.depthDependentData.sort(compareInterval);

  return result;
};

export const initializeResult = (data?: SoilData): SoilData => {
  if (data) {
    return cloneDeep(data);
  } else {
    return {
      depthIntervalPreset: DEFAULT_DEPTH_INTERVAL_PRESET,
      depthIntervals: [],
      depthDependentData: [],
    };
  }
};

export const updateFields = <I, D extends object>(
  input: I,
  result: D,
  fields: (keyof I)[] & (keyof D)[],
) => {
  const updatedFields = fields.filter(field => input[field] !== undefined);
  const update = Object.fromEntries(
    updatedFields.map(field => [field, input[field]]),
  );
  Object.assign(result, update);
};
