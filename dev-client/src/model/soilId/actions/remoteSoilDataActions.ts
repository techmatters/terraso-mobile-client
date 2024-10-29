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
  SoilDataPushEntry,
  SoilDataPushFailureReason,
  SoilDataPushInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as remoteSoilData from 'terraso-client-shared/soilId/soilDataService';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  ChangeRecords,
  SyncActionResults,
} from 'terraso-mobile-client/model/sync/sync';

export const pushSoilData = async (
  unsyncedChanges: ChangeRecords<SoilData>,
  unsyncedData: Record<string, SoilData>,
): Promise<SyncActionResults<SoilData, SoilDataPushFailureReason>> => {
  const input = unsyncedDataToMutationInput(unsyncedChanges, unsyncedData);
  const results = await remoteSoilData.pushSoilData(input);
  return mutationResponseToResults(results as SoilDataPushEntry[]);
};

export const unsyncedDataToMutationInput = (
  _: ChangeRecords<SoilData>,
  __: Record<string, SoilData>,
): SoilDataPushInput => {
  throw new Error('Function not implemented.');
};

export const mutationResponseToResults = (
  _: SoilDataPushEntry[],
): SyncActionResults<SoilData, SoilDataPushFailureReason> => {
  throw new Error('Function not implemented.');
};
