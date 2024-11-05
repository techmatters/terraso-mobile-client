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
  SoilDataPushEntry,
  SoilDataPushFailureReason,
  SoilDataPushInput,
  SoilDataPushInputEntry,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as remoteSoilData from 'terraso-client-shared/soilId/soilDataService';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {getDeletedDepthIntervals} from 'terraso-mobile-client/model/soilId/actions/soilDataDiff';
import {
  ChangeRecord,
  ChangeRecords,
  getChangeRecord,
  SyncActionResults,
} from 'terraso-mobile-client/model/sync/sync';

export const pushSoilData = async (
  unsyncedChanges: ChangeRecords<SoilData, SoilDataPushFailureReason>,
  unsyncedData: Record<string, SoilData | undefined>,
): Promise<SyncActionResults<SoilData, SoilDataPushFailureReason>> => {
  const input = unsyncedDataToMutationInput(unsyncedChanges, unsyncedData);
  const response = await remoteSoilData.pushSoilData(input);
  return mutationResponseToResults(
    unsyncedChanges,
    response as SoilDataPushEntry[],
  );
};

export const unsyncedDataToMutationInput = (
  unsyncedChanges: ChangeRecords<SoilData, unknown>,
  unsyncedData: Record<string, SoilData | undefined>,
): SoilDataPushInput => {
  return {
    soilDataEntries: Object.entries(unsyncedData)
      .filter(([_, soilData]) => soilData !== undefined)
      .map(([siteId, soilData]) =>
        unsyncedDataToMutationInputEntry(
          siteId,
          getChangeRecord(unsyncedChanges, siteId),
          soilData! /* Safe to use ! here bc of above filter() call */,
        ),
      ),
  };
};

export const unsyncedDataToMutationInputEntry = (
  siteId: string,
  record: ChangeRecord<SoilData, unknown>,
  soilData: SoilData,
): SoilDataPushInputEntry => {
  return {
    siteId,
    soilData: {
      ...soilData,
      depthIntervals: soilData.depthIntervals.map(di => cloneDeep(di)),
      depthDependentData: soilData.depthDependentData.map(dd => cloneDeep(dd)),
      deletedDepthIntervals: getDeletedDepthIntervals(
        soilData,
        record.lastSyncedData,
      ),
    },
  };
};

export const mutationResponseToResults = (
  unsyncedChanges: ChangeRecords<SoilData, unknown>,
  response: SoilDataPushEntry[],
): SyncActionResults<SoilData, SoilDataPushFailureReason> => {
  const results: SyncActionResults<SoilData, SoilDataPushFailureReason> = {
    data: {},
    errors: {},
  };
  for (const responseEntry of response) {
    const siteId = responseEntry.siteId;
    const revisionId = getChangeRecord(unsyncedChanges, siteId).revisionId;
    if ('soilData' in responseEntry.result) {
      results.data[siteId] = {
        revisionId,
        data: responseEntry.result.soilData,
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
