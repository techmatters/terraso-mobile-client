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
import type {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import type {ThunkAPI} from 'terraso-client-shared/store/utils';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {fetchElevationForCoords} from 'terraso-mobile-client/model/elevation/elevationService';
import {pushNote} from 'terraso-mobile-client/model/site/actions/pushNoteActions';
import {pushSite} from 'terraso-mobile-client/model/site/actions/pushSiteActions';
import {selectSiteChanges} from 'terraso-mobile-client/model/site/siteSelectors';
import {setSiteElevation} from 'terraso-mobile-client/model/site/siteSlice';
import {pushSoilDataForSite} from 'terraso-mobile-client/model/soilData/actions/pushSoilDataActions';
import {selectSoilChanges} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {pushSoilMetadataForSite} from 'terraso-mobile-client/model/soilMetadata/pushSoilMetadataActions';
import {selectSoilMetadataChanges} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {pushEntities} from 'terraso-mobile-client/model/sync/actions/pushEntities';
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
  siteResults?: SyncResults<Site, string>;
  noteResults?: SyncResults<SiteNote, string>;
  soilDataResults?: SyncResults<SoilData, string>;
  soilMetadataResults?: SyncResults<SoilMetadata, string>;
};

export const pushUserData = async (
  input: {
    soilDataSiteIds?: string[];
    soilMetadataSiteIds?: string[];
    siteSiteIds?: string[];
    noteIds?: string[];
  },
  _: User | null,
  thunkApi: ThunkAPI,
): Promise<PushUserDataResults> => {
  const state = thunkApi.getState() as AppState;
  const results: PushUserDataResults = {};

  // 1. Push sites (must exist before soil data and notes)
  if (input.siteSiteIds && input.siteSiteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(selectSiteChanges(state), input.siteSiteIds),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      let siteData = getDataForRecords(
        unsyncedChanges,
        state.site.sites,
      ) as Record<string, Site>;

      siteData = await fetchMissingElevations(siteData, thunkApi.dispatch);

      if (syncDebugEnabled) {
        console.log('📤 pushing', Object.keys(unsyncedChanges).length, 'sites');
      }
      results.siteResults = await pushEntities(
        unsyncedChanges,
        siteData,
        pushSite,
      );
    }
  }

  // 2. Push notes
  if (input.noteIds && input.noteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(state.site.noteSync, input.noteIds),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      // Build flat note data map from all sites
      const noteData: Record<string, SiteNote | undefined> = {};
      for (const site of Object.values(state.site.sites)) {
        for (const [noteId, note] of Object.entries(site.notes)) {
          noteData[noteId] = note;
        }
      }

      if (syncDebugEnabled) {
        console.log('📤 pushing', Object.keys(unsyncedChanges).length, 'notes');
      }
      results.noteResults = await pushEntities(
        unsyncedChanges,
        noteData,
        pushNote,
      );
    }
  }

  // 3. Push soil data
  if (input.soilDataSiteIds && input.soilDataSiteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(selectSoilChanges(state), input.soilDataSiteIds),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      const soilData = getDataForRecords(
        unsyncedChanges,
        state.soilData.soilData,
      );

      if (syncDebugEnabled) {
        console.log(
          '📤 pushing',
          Object.keys(unsyncedChanges).length,
          'soilData',
        );
      }
      results.soilDataResults = await pushEntities(
        unsyncedChanges,
        soilData,
        pushSoilDataForSite,
      );
    }
  }

  // 4. Push soil metadata
  if (input.soilMetadataSiteIds && input.soilMetadataSiteIds.length > 0) {
    const unsyncedChanges = getUnsyncedRecords(
      getEntityRecords(
        selectSoilMetadataChanges(state),
        input.soilMetadataSiteIds,
      ),
    );
    if (Object.keys(unsyncedChanges).length > 0) {
      const metadataData = getDataForRecords(
        unsyncedChanges,
        state.soilMetadata.soilMetadata,
      );

      if (syncDebugEnabled) {
        console.log(
          '📤 pushing',
          Object.keys(unsyncedChanges).length,
          'soilMetadata',
        );
      }
      results.soilMetadataResults = await pushEntities(
        unsyncedChanges,
        metadataData,
        pushSoilMetadataForSite,
      );
    }
  }

  return results;
};
