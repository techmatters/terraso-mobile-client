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

import Mapbox from '@rnmapbox/maps';

import type {User} from 'terraso-client-shared/account/accountSlice';
import type {
  SoilDataPushEntry,
  SoilDataPushFailureReason,
  SoilMetadataPushEntry,
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

import {fetchElevationForCoords} from 'terraso-mobile-client/model/elevation/elevationService';
import {
  pushSiteChanges,
  SitePushFailureReason,
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
  getEntityRecord,
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

  // Fetch all elevations in parallel
  const elevationResults = await Promise.all(
    sitesNeedingElevation.map(async ([siteId, site]) => {
      const elevation = await fetchElevationForCoords(
        site.latitude,
        site.longitude,
      );

      console.log(`⛰️ Elevation for ${site.name} = ${elevation}`);
      return {siteId, elevation};
    }),
  );

  // Update Redux and build updated site data
  const updatedSiteData = {...siteData};
  for (const {siteId, elevation} of elevationResults) {
    if (elevation !== null) {
      dispatch(setSiteElevation({siteId, elevation}));
      updatedSiteData[siteId] = {...updatedSiteData[siteId], elevation};
    }
  }

  return updatedSiteData;
};

// Bounding box half-width in degrees (~1km at equator), covering what StaticMapView shows at zoom 15
const SATELLITE_PREFETCH_DELTA = 0.01;

/**
 * Creates Mapbox offline packs for newly synced sites so satellite images are
 * available offline. Fire-and-forget: failures don't block sync.
 */
const prefetchSatelliteTilesForNewSites = (
  siteResults: SyncResults<Site, SitePushFailureReason>,
  siteUnsyncedChanges: SyncRecords<Site, SitePushFailureReason>,
): void => {
  const newlySyncedSites = Object.entries(siteResults.data).filter(
    ([siteId]) => {
      const record = getEntityRecord(siteUnsyncedChanges, siteId);
      return record.lastSyncedData === undefined;
    },
  );

  console.log(
    `🛰️ Prefetching satellite tiles for ${newlySyncedSites.length} new sites`,
  );

  if (newlySyncedSites.length === 0) {
    return;
  }

  Promise.allSettled(
    newlySyncedSites.map(async ([siteId, {value: site}]) => {
      const packName = `site-${siteId}-satellite`;

      const existingPack = await Mapbox.offlineManager.getPack(packName);
      if (existingPack) {
        return;
      }

      const {latitude, longitude} = site;
      await Mapbox.offlineManager.createPack(
        {
          name: packName,
          styleURL: Mapbox.StyleURL.Satellite,
          minZoom: 14,
          maxZoom: 16,
          bounds: [
            [
              longitude + SATELLITE_PREFETCH_DELTA,
              latitude + SATELLITE_PREFETCH_DELTA,
            ], // NE [lng, lat]
            [
              longitude - SATELLITE_PREFETCH_DELTA,
              latitude - SATELLITE_PREFETCH_DELTA,
            ], // SW [lng, lat]
          ],
        },
        (_pack, status) =>
          console.log(`🛰️ Satellite pack progress for ${site.name}:`, status),
      );

      console.log(`🛰️ Created offline satellite pack for site ${site.name}`);
    }),
  ).catch(err => console.warn('🛰️ Error prefetching satellite tiles:', err));
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

  const results: PushUserDataResults = {};

  // Push site changes first so new sites exist on the server
  // before soil data/metadata references them
  if (siteUnsyncedChanges && siteUnsyncedData) {
    // Fetch elevation for sites missing it before pushing
    const siteDataWithElevation = await fetchMissingElevations(
      siteUnsyncedData,
      thunkApi.dispatch,
    );
    results.siteResults = await pushSiteChanges(
      siteUnsyncedChanges,
      siteDataWithElevation,
    );
    // Fire-and-forget: prefetch satellite tiles for newly created sites
    prefetchSatelliteTilesForNewSites(results.siteResults, siteUnsyncedChanges);
  }

  // Push soil data and metadata via the bulk pushUserData mutation
  if (soilDataUnsyncedChanges || soilMetadataUnsyncedChanges) {
    console.log(
      '📤 pushUserData (bulk):',
      soilDataUnsyncedChanges
        ? `${Object.keys(soilDataUnsyncedChanges).length} soilData`
        : '0 soilData',
      soilMetadataUnsyncedChanges
        ? `${Object.keys(soilMetadataUnsyncedChanges).length} soilMetadata`
        : '0 soilMetadata',
    );
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

    const response = await syncService.pushUserData(mutationInput);

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
  }

  return results;
};
