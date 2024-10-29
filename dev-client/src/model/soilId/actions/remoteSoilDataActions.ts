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
  getRecord,
  SyncActionResults,
} from 'terraso-mobile-client/model/sync/sync';

export const pushSoilData = async (
  unsyncedChanges: ChangeRecords<SoilData, SoilDataPushFailureReason>,
  unsyncedData: Record<string, SoilData>,
): Promise<SyncActionResults<SoilData, SoilDataPushFailureReason>> => {
  const input = unsyncedDataToMutationInput(unsyncedChanges, unsyncedData);
  const response = await remoteSoilData.pushSoilData(input);
  return mutationResponseToResults(
    unsyncedChanges,
    response as SoilDataPushEntry[],
  );
};

export const unsyncedDataToMutationInput = (
  _: ChangeRecords<SoilData, SoilDataPushFailureReason>,
  __: Record<string, SoilData>,
): SoilDataPushInput => {
  throw new Error('Function not implemented.');
};

export const mutationResponseToResults = (
  unsyncedChanges: ChangeRecords<SoilData, SoilDataPushFailureReason>,
  response: SoilDataPushEntry[],
): SyncActionResults<SoilData, SoilDataPushFailureReason> => {
  const results: SyncActionResults<SoilData, SoilDataPushFailureReason> = {
    data: {},
    errors: {},
  };
  for (const responseEntry of response) {
    const siteId = responseEntry.siteId;
    const revisionId = getRecord(unsyncedChanges, siteId).revisionId;
    if ('site' in responseEntry.result) {
      results.data[siteId] = {
        revisionId,
        data: responseEntry.result.site.soilData,
      };
    } else {
      results.errors[siteId] = {
        revisionId,
        data: responseEntry.result.reason,
      };
    }
  }
  return results;
};
