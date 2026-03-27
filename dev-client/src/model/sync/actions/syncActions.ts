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
  SoilDataPushFailureReason,
  SoilMetadataPushFailureReason,
  UserDataPushInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import type {Site} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import * as syncService from 'terraso-client-shared/soilId/syncService';
import type {ThunkAPI} from 'terraso-client-shared/store/utils';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {fetchElevationForCoords} from 'terraso-mobile-client/model/elevation/elevationService';
import {
  siteMutationResponseToResults,
  unsyncedSitesToMutationInput,
  type SitePushFailureReason,
} from 'terraso-mobile-client/model/site/actions/remoteSiteActions';
import {selectSiteChanges} from 'terraso-mobile-client/model/site/siteSelectors';
import {setSiteElevation} from 'terraso-mobile-client/model/site/siteSlice';
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

/**
 * Fetches elevation for all sites that are missing it.
 * Updates Redux state with fetched elevations and returns updated site data.
 * Elevation fetch failures are non-blocking - sites continue without elevation.
 */
const fetchMissingElevations = async (
  siteData: Record<string, Site>,
  dispatch: ThunkAPI['dispatch'],
): Promise<Record<string, Site>> => {
  const sitesNeedingElevation = Object.entries(siteData).filter(
    ([_, site]) => site.elevation == null,
  );

  if (sitesNeedingElevation.length === 0) {
    return siteData;
  }

  const elevationResults = await Promise.all(
    sitesNeedingElevation.map(async ([siteId, site]) => {
      const elevation = await fetchElevationForCoords(
        site.latitude,
        site.longitude,
      );

      if (syncDebugEnabled) {
        console.log(`⛰️ Elevation for ${site.name} = ${elevation}`);
      }
      return {siteId, elevation};
    }),
  );

  const updatedSiteData = {...siteData};
  for (const {siteId, elevation} of elevationResults) {
    if (elevation !== undefined) {
      dispatch(setSiteElevation({siteId, elevation}));
      updatedSiteData[siteId] = {...updatedSiteData[siteId], elevation};
    }
  }

  return updatedSiteData;
};

export type PushUserDataResults = {
  soilDataResults?: SyncResults<SoilData, SoilDataPushFailureReason>;
  soilMetadataResults?: SyncResults<
    SoilMetadata,
    SoilMetadataPushFailureReason
  >;
  siteResults?: SyncResults<Site, SitePushFailureReason>;
};

export const pushUserData = async (
  input: {
    soilDataSiteIds?: string[];
    soilMetadataSiteIds?: string[];
    siteSiteIds?: string[];
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

  // Build records for sites (filter to only unsynced)
  let siteUnsyncedChanges: SyncRecords<Site, SitePushFailureReason> | undefined;
  let siteUnsyncedData: Record<string, Site> | undefined;

  if (input.siteSiteIds && input.siteSiteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(selectSiteChanges(state), input.siteSiteIds),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      siteUnsyncedChanges = unsyncedChanges;
      siteUnsyncedData = getDataForRecords(
        unsyncedChanges,
        state.site.sites,
      ) as Record<string, Site>;
    }
  }

  // If nothing to push, return empty results
  if (
    !soilDataUnsyncedChanges &&
    !soilMetadataUnsyncedChanges &&
    !siteUnsyncedChanges
  ) {
    return {};
  }

  // Fetch elevation for new/updated sites before building mutation input
  if (siteUnsyncedChanges && siteUnsyncedData) {
    siteUnsyncedData = await fetchMissingElevations(
      siteUnsyncedData,
      thunkApi.dispatch,
    );
  }

  // Build the unified mutation input — sites, soil data, and metadata in one request
  const mutationInput: UserDataPushInput = {
    siteEntries:
      siteUnsyncedChanges && siteUnsyncedData
        ? unsyncedSitesToMutationInput(siteUnsyncedChanges, siteUnsyncedData)
        : null,
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

  if (syncDebugEnabled) {
    console.log(
      '📤 pushUserData (bulk):',
      mutationInput.siteEntries?.length ?? 0,
      'sites,',
      mutationInput.soilDataEntries?.length ?? 0,
      'soilData,',
      mutationInput.soilMetadataEntries?.length ?? 0,
      'soilMetadata',
    );
  }

  const results: PushUserDataResults = {};

  try {
    const response = await syncService.pushUserData(mutationInput);

    if (siteUnsyncedChanges && response.siteResults) {
      results.siteResults = siteMutationResponseToResults(
        siteUnsyncedChanges,
        response.siteResults,
      );
      if (Object.keys(results.siteResults.errors).length > 0) {
        console.log(
          'pushUserData ERROR: site push failure reasons',
          results.siteResults.errors,
        );
      }
    }

    if (soilDataUnsyncedChanges && response.soilDataResults) {
      results.soilDataResults = soilDataMutationResponseToResults(
        soilDataUnsyncedChanges,
        response.soilDataResults,
      );
      if (Object.keys(results.soilDataResults.errors).length > 0) {
        console.log(
          'pushUserData ERROR: soil data push failure reasons',
          results.soilDataResults.errors,
        );
      }
    }

    if (soilMetadataUnsyncedChanges && response.soilMetadataResults) {
      results.soilMetadataResults = metadataMutationResponseToResults(
        soilMetadataUnsyncedChanges,
        response.soilMetadataResults,
      );
      if (Object.keys(results.soilMetadataResults.errors).length > 0) {
        console.log(
          'pushUserData ERROR: soil metadata push failure reasons',
          results.soilMetadataResults.errors,
        );
      }
    }
  } catch (error) {
    if (
      Array.isArray(error) &&
      (error as unknown[]).includes('terraso_api.error_request_response')
    ) {
      console.log('pushUserData ERROR: could not reach server', error);
    } else {
      console.log('pushUserData ERROR: mutation-level error', error);
    }
    throw error;
  }

  return results;
};
