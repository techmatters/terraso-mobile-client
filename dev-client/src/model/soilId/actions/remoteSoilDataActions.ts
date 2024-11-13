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
  SoilDataPushInputEntry,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as remoteSoilData from 'terraso-client-shared/soilId/soilDataService';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  getChangedDepthDependentData,
  getChangedDepthIntervals,
  getChangedSoilDataFields,
  getDeletedDepthIntervals,
} from 'terraso-mobile-client/model/soilId/actions/soilDataDiff';
import {
  getEntityRecord,
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {SyncResults} from 'terraso-mobile-client/model/sync/results';

export const pushSoilData = async (
  unsyncedChanges: SyncRecords<SoilData, SoilDataPushFailureReason>,
  unsyncedData: Record<string, SoilData | undefined>,
): Promise<SyncResults<SoilData, SoilDataPushFailureReason>> => {
  const input = unsyncedDataToMutationInput(unsyncedChanges, unsyncedData);
  const response = await remoteSoilData.pushSoilData(input);
  return mutationResponseToResults(
    unsyncedChanges,
    response as SoilDataPushEntry[],
  );
};

export const unsyncedDataToMutationInput = (
  unsyncedChanges: SyncRecords<SoilData, unknown>,
  unsyncedData: Record<string, SoilData | undefined>,
): SoilDataPushInput => {
  return {
    soilDataEntries: Object.entries(unsyncedData)
      .filter(([_, soilData]) => soilData !== undefined)
      .map(([siteId, soilData]) =>
        unsyncedDataToMutationInputEntry(
          siteId,
          getEntityRecord(unsyncedChanges, siteId),
          soilData! /* Safe to use ! here bc of above filter() call */,
        ),
      ),
  };
};

export const unsyncedDataToMutationInputEntry = (
  siteId: string,
  record: SyncRecord<SoilData, unknown>,
  soilData: SoilData,
): SoilDataPushInputEntry => {
  return {
    siteId,
    soilData: {
      ...getChangedSoilDataFields(soilData, record.lastSyncedData),
      depthIntervals: getChangedDepthIntervals(
        soilData,
        record.lastSyncedData,
      ).map(changes => {
        return {depthInterval: changes.depthInterval, ...changes.changedFields};
      }),
      deletedDepthIntervals: getDeletedDepthIntervals(
        soilData,
        record.lastSyncedData,
      ),
      depthDependentData: getChangedDepthDependentData(
        soilData,
        record.lastSyncedData,
      ).map(changes => {
        return {depthInterval: changes.depthInterval, ...changes.changedFields};
      }),
    },
  };
};

export const mutationResponseToResults = (
  unsyncedChanges: SyncRecords<SoilData, unknown>,
  response: SoilDataPushEntry[],
): SyncResults<SoilData, SoilDataPushFailureReason> => {
  const results: SyncResults<SoilData, SoilDataPushFailureReason> = {
    data: {},
    errors: {},
  };
  for (const responseEntry of response) {
    const siteId = responseEntry.siteId;
    const revisionId = getEntityRecord(unsyncedChanges, siteId).revisionId;
    if ('soilData' in responseEntry.result) {
      results.data[siteId] = {
        revisionId,
        value: responseEntry.result.soilData,
      };
    } else {
      results.errors[siteId] = {
        revisionId,
        value: responseEntry.result.reason,
      };
    }
  }
  return results;
};
