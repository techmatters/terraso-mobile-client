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
  SiteDataPushInput,
  SoilDataPushEntry,
  SoilDataPushFailureReason,
  SoilMetadataPushEntry,
  SoilMetadataPushFailureReason,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
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

export type PushSiteDataResults = {
  soilDataResults?: SyncResults<SoilData, SoilDataPushFailureReason>;
  soilMetadataResults?: SyncResults<
    SoilMetadata,
    SoilMetadataPushFailureReason
  >;
};

export const pushSiteData = async (
  input: {
    soilDataSiteIds?: string[];
    soilMetadataSiteIds?: string[];
  },
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<PushSiteDataResults> => {
  const state = thunkApi.getState() as AppState;

  // Build records for soilData (filter to only unsynced)
  let soilDataUnsyncedChanges = {} as SyncRecords<
    SoilData,
    SoilDataPushFailureReason
  >;
  let soilDataUnsyncedData = {} as Record<string, SoilData | undefined>;

  if (input.soilDataSiteIds && input.soilDataSiteIds.length > 0) {
    soilDataUnsyncedChanges = getUnsyncedRecords(
      getEntityRecords(selectSoilChanges(state), input.soilDataSiteIds),
    );
    soilDataUnsyncedData = getDataForRecords(
      soilDataUnsyncedChanges,
      state.soilData.soilData,
    );
  }

  // Build records for soilMetadata (filter to only unsynced)
  let soilMetadataUnsyncedChanges = {} as SyncRecords<
    SoilMetadata,
    SoilMetadataPushFailureReason
  >;
  let soilMetadataUnsyncedData = {} as Record<string, SoilMetadata | undefined>;

  if (input.soilMetadataSiteIds && input.soilMetadataSiteIds.length > 0) {
    soilMetadataUnsyncedChanges = getUnsyncedRecords(
      getEntityRecords(
        selectSoilMetadataChanges(state),
        input.soilMetadataSiteIds,
      ),
    );
    soilMetadataUnsyncedData = getDataForRecords(
      soilMetadataUnsyncedChanges,
      state.soilMetadata.soilMetadata,
    );
  }

  // If nothing to push, return empty results
  if (
    Object.keys(soilDataUnsyncedChanges).length === 0 &&
    Object.keys(soilMetadataUnsyncedChanges).length === 0
  ) {
    return {};
  }

  // Build mutation input
  const mutationInput: SiteDataPushInput = {
    soilDataEntries:
      soilDataUnsyncedChanges && soilDataUnsyncedData
        ? unsyncedSoilDataToMutationInput(
            soilDataUnsyncedChanges,
            soilDataUnsyncedData,
          ).soilDataEntries
        : null,
    soilMetadataEntries:
      soilMetadataUnsyncedChanges && soilMetadataUnsyncedData
        ? unsyncedMetadataToMutationInput(
            soilMetadataUnsyncedChanges,
            soilMetadataUnsyncedData,
          )
        : null,
  };

  // Call the service
  const response = await soilDataService.pushSiteData(mutationInput);

  // Transform response to results
  const results: PushSiteDataResults = {};

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
