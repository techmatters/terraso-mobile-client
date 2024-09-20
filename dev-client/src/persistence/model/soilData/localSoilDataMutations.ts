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
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  DepthDependentSoilData,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdTypes';

export type MutationResult<T, E> = {
  result: T;
  errors: E[];
};

export const mutateSoilData = (
  input: SoilDataUpdateMutationInput,
  data: SoilData,
): MutationResult<SoilData, any> => {
  const result = {...data};

  /* TODO: port logic from soil_data.py */

  return {
    errors: [],
    result,
  };
};

export const mutateSoilDataDepthInterval = (
  input: SoilDataUpdateDepthIntervalMutationInput,
  data: SoilDataDepthInterval,
): MutationResult<SoilDataDepthInterval, any> => {
  const result = {...data};

  /* TODO: port logic from soil_data.py */

  return {
    errors: [],
    result,
  };
};

export const mutateDepthDependentSoilData = (
  input: DepthDependentSoilDataUpdateMutationInput,
  data: DepthDependentSoilData,
): MutationResult<DepthDependentSoilData, any> => {
  const result = {...data};

  /* TODO: port logic from soil_data.py */

  return {
    errors: [],
    result,
  };
};
