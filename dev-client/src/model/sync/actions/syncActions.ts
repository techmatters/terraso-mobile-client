/*
 * Copyright © 2025 Technology Matters
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

import type {User} from 'terraso-client-shared/account/accountSlice';
import type {
  SoilDataPushEntry,
  SoilDataPushFailureReason,
  SoilMetadataPushEntry,
  SoilMetadataPushFailureReason,
  UserDataPushInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import * as syncService from 'terraso-client-shared/soilId/syncService';
import type {ThunkAPI} from 'terraso-client-shared/store/utils';

import {
  soilDataMutationResponseToResults,
  unsyncedSoilDataToMutationInput,
} from 'terraso-mobile-client/model/soilData/actions/remoteSoilDataActions';
import {selectSoilChanges} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {
  metadataMutationResponseToResults,
  unsyncedMetadataToMutationInput,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataPushUtils';
import {selectSoilMetadataChanges} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import type {SyncRecords} from 'terraso-mobile-client/model/sync/records';
import {
  getDataForRecords,
  getEntityRecords,
  getUnsyncedRecords,
} from 'terraso-mobile-client/model/sync/records';
import type {SyncResults} from 'terraso-mobile-client/model/sync/results';
import type {AppState} from 'terraso-mobile-client/store';

export type PushUserDataResults = {
  soilDataResults?: SyncResults<SoilData, SoilDataPushFailureReason>;
  soilMetadataResults?: SyncResults<
    SoilMetadata,
    SoilMetadataPushFailureReason
  >;
};

export const pushUserData = async (
  input: {
    soilDataSiteIds?: string[];
    soilMetadataSiteIds?: string[];
  },
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<PushUserDataResults> => {
  const state = thunkApi.getState() as AppState;

  // Build records for soilData (filter to only unsynced)
  let soilDataUnsyncedChanges:
    | SyncRecords<SoilData, SoilDataPushFailureReason>
    | undefined;
  let soilDataUnsyncedData: Record<string, SoilData | undefined> | undefined;

  if (input.soilDataSiteIds && input.soilDataSiteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(selectSoilChanges(state), input.soilDataSiteIds),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      soilDataUnsyncedChanges = unsyncedChanges;
      soilDataUnsyncedData = getDataForRecords(
        unsyncedChanges,
        state.soilData.soilData,
      );
    }
  }

  // Build records for soilMetadata (filter to only unsynced)
  let soilMetadataUnsyncedChanges:
    | SyncRecords<SoilMetadata, SoilMetadataPushFailureReason>
    | undefined;
  let soilMetadataUnsyncedData:
    | Record<string, SoilMetadata | undefined>
    | undefined;

  if (input.soilMetadataSiteIds && input.soilMetadataSiteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(
        selectSoilMetadataChanges(state),
        input.soilMetadataSiteIds,
      ),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      soilMetadataUnsyncedChanges = unsyncedChanges;
      soilMetadataUnsyncedData = getDataForRecords(
        unsyncedChanges,
        state.soilMetadata.soilMetadata,
      );
    }
  }

  // If nothing to push, return empty results
  if (!soilDataUnsyncedChanges && !soilMetadataUnsyncedChanges) {
    return {};
  }

  // Build mutation input
  const mutationInput: UserDataPushInput = {
    soilDataEntries:
      soilDataUnsyncedChanges && soilDataUnsyncedData
        ? unsyncedSoilDataToMutationInput(
            soilDataUnsyncedChanges,
            soilDataUnsyncedData,
          ).soilDataEntries
        : null,
    soilMetadataEntries:
      soilMetadataUnsyncedChanges && soilMetadataUnsyncedData
        ? unsyncedMetadataToMutationInput(soilMetadataUnsyncedData)
        : null,
  };

  // Call the service
  const response = await syncService.pushUserData(mutationInput);

  // Transform response to results
  const results: PushUserDataResults = {};

  if (soilDataUnsyncedChanges && response.soilDataResults) {
    results.soilDataResults = soilDataMutationResponseToResults(
      soilDataUnsyncedChanges,
      response.soilDataResults as SoilDataPushEntry[],
    );
  }

  if (soilMetadataUnsyncedChanges && response.soilMetadataResults) {
    results.soilMetadataResults = metadataMutationResponseToResults(
      soilMetadataUnsyncedChanges,
      response.soilMetadataResults as SoilMetadataPushEntry[],
    );
  }

  return results;
};
