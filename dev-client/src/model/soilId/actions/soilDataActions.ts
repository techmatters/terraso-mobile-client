/*
 * Copyright © 2023 Technology Matters
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
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {SOIL_DATA_UPDATE_FIELDS} from 'terraso-mobile-client/model/soilId/actions/soilDataActionFields';

export const updateSoilData = (
  input: SoilDataUpdateMutationInput,
  data: SoilData,
): SoilData => {
  const result = initializeResult(data);
  updateFields(input, result, SOIL_DATA_UPDATE_FIELDS);

  /* Specifying a depth interval preset clears all existing depth intervals */
  if (
    input.depthIntervalPreset !== undefined &&
    input.depthIntervalPreset !== data.depthIntervalPreset
  ) {
    result.depthIntervals = [];
  }

  return result;
};

export const deleteSoilDataDepthInterval = (
  input: SoilDataDeleteDepthIntervalMutationInput,
  data: SoilData,
): SoilData => {
  const result = initializeResult(data);

  return result;
};

export const updateSoilDataDepthInterval = (
  input: SoilDataUpdateDepthIntervalMutationInput,
  data: SoilData,
): SoilData => {
  const result = initializeResult(data);

  return result;
};

export const updateDepthDependentSoilData = (
  input: DepthDependentSoilDataUpdateMutationInput,
  data: SoilData,
): SoilData => {
  const result = initializeResult(data);

  return result;
};

export const initializeResult = (data: SoilData): SoilData => {
  return cloneDeep(data);
};

export const updateFields = <I, D extends object>(
  input: I,
  result: D,
  fields: (keyof I)[] & (keyof D)[],
) => {
  const update = Object.fromEntries(
    fields
      .filter(field => input[field] !== undefined)
      .map(field => [field, input[field]]),
  );
  Object.assign(result, update);
};
