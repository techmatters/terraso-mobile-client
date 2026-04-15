/*
 * Copyright © 2023 Technology Matters
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

import {createSlice, Draft} from '@reduxjs/toolkit';

import * as siteService from 'terraso-client-shared/site/siteService';
import {Site} from 'terraso-client-shared/site/siteTypes';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {SitePushFailureReason} from 'terraso-mobile-client/model/site/actions/remoteSiteActions';
import * as siteActions from 'terraso-mobile-client/model/site/actions/siteActions';
import {
  markEntityModified,
  mergeUnsyncedEntities,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {
  logSyncChange,
  logSyncSummary,
} from 'terraso-mobile-client/model/sync/syncDebugLog';

const initialState = {
  sites: {} as Record<string, Site>,
  siteSync: {} as SyncRecords<Site, SitePushFailureReason>,
  // Set to true when the user deletes a site via the UI, cleared on the next
  // pull. This suppresses the "sync conflict" error dialog that would otherwise
  // fire when ScreenDataRequirements detects the site is missing — on a
  // user-initiated delete, silently navigating back is the right behavior.
  //
  // We don't track which site was deleted, so in theory: if the user deletes
  // site A, then navigates to site B, and a pull removes site B before the
  // flag is cleared, the error dialog for site B would be incorrectly
  // suppressed. This is near-impossible in practice because the pull itself
  // clears the flag. However, this could be an issue if sites can be deleted
  // offline: offline delete site A, edit site B, navigate to site C, return
  // online. If someone has deleted site B, you don't get a sync conflict
  // notification.
  siteDeletedByUser: false,
};

type SiteState = typeof initialState;

export const fetchSite = createAsyncThunk(
  'site/fetchSite',
  siteService.fetchSite,
);

export const fetchSitesForProject = createAsyncThunk(
  'site/fetchSitesForProject',
  siteService.fetchSitesForProject,
);

export const fetchSitesForUser = createAsyncThunk(
  'site/fetchSitesForUser',
  siteService.fetchSitesForUser,
);

export const addSiteNote = createAsyncThunk(
  'site/addSiteNote',
  siteActions.addSiteNoteAction,
);

export const deleteSiteNote = createAsyncThunk(
  'site/deleteSiteNote',
  siteActions.deleteSiteNoteAction,
);

export const updateSiteNote = createAsyncThunk(
  'site/updateSiteNote',
  siteActions.updateSiteNoteAction,
);

export const setSites = (
  state: Draft<SiteState>,
  sites: Record<string, Site>,
) => {
  const badIncoming = Object.values(sites).filter(
    s => typeof s.latitude !== 'number' || typeof s.longitude !== 'number',
  );
  if (badIncoming.length > 0) {
    console.error(
      '🔄 setSites: incoming sites with bad coords:',
      badIncoming.map(s => ({id: s.id, lat: s.latitude, lon: s.longitude})),
    );
  }

  const {mergedRecords, mergedData} = mergeUnsyncedEntities(
    state.siteSync,
    state.sites,
    sites,
  );

  const badMerged = Object.values(mergedData).filter(
    s => typeof s.latitude !== 'number' || typeof s.longitude !== 'number',
  );
  if (badMerged.length > 0) {
    console.error(
      '🔄 setSites: merged sites with bad coords:',
      badMerged.map(s => ({id: s.id, lat: s.latitude, lon: s.longitude})),
    );
  }

  state.sites = mergedData;
  state.siteSync = mergedRecords;
  logSyncSummary('setSites (pull)', 'site', mergedRecords, mergedData);
};

export const updateSites = (
  state: Draft<SiteState>,
  sites: Record<string, Site>,
) => {
  Object.assign(state.sites, sites);
};

export const updateProjectOfSite = (
  state: Draft<SiteState>,
  args: {siteId: string; projectId: string},
) => {
  state.sites[args.siteId].projectId = args.projectId;
};

export const deleteSites = (state: Draft<SiteState>, siteIds: string[]) => {
  for (const siteId of siteIds) {
    delete state.sites[siteId];
    delete state.siteSync[siteId];
  }
};

const siteSlice = createSlice({
  name: 'site',
  initialState,
  reducers: {
    setSiteElevation: (
      state,
      action: {payload: {siteId: string; elevation: number}},
    ) => {
      const {siteId, elevation} = action.payload;
      if (state.sites[siteId]) {
        state.sites[siteId].elevation = elevation;
        if (syncDebugEnabled) {
          console.log(
            `. Updated site elevation (${elevation}) for ${state.sites[siteId].name}`,
          );
        }
        // Note: We intentionally do NOT mark the site as modified for sync here. If later you do want to change elevation and mark the site modified, make a separate action.
        // The elevation is being fetched as part of sync, and the site
        // is already marked as unsynced. The push will include the elevation.
      }
    },
  },
  extraReducers: builder => {
    // TODO: add case to delete site if not found
    builder.addCase(fetchSite.fulfilled, (state, {payload: site}) => {
      state.sites[site.id] = site;
    });

    // TODO: add case to delete project sites if project not found
    builder.addCase(
      fetchSitesForProject.fulfilled,
      (state, {payload: sites, meta: {arg: projectId}}) => {
        Object.values(state.sites)
          .filter(site => site.projectId === projectId)
          .forEach(site => {
            delete state.sites[site.id];
          });
        Object.assign(
          state.sites,
          Object.fromEntries(sites.map(site => [site.id, site])),
        );
      },
    );

    builder.addCase(fetchSitesForUser.fulfilled, (state, {payload: sites}) => {
      state.sites = Object.fromEntries(sites.map(site => [site.id, site]));
    });

    builder.addCase(addSiteNote.fulfilled, (state, {payload: siteNote}) => {
      state.sites[siteNote.siteId].notes[siteNote.id] = siteNote;
      markEntityModified(state.siteSync, siteNote.siteId, Date.now());
      logSyncChange(
        'addSiteNote',
        'site',
        siteNote.siteId,
        state.siteSync[siteNote.siteId],
        state.sites[siteNote.siteId],
      );
    });

    builder.addCase(deleteSiteNote.fulfilled, (state, {payload: siteNote}) => {
      delete state.sites[siteNote.siteId].notes[siteNote.id];
      markEntityModified(state.siteSync, siteNote.siteId, Date.now());
      logSyncChange(
        'deleteSiteNote',
        'site',
        siteNote.siteId,
        state.siteSync[siteNote.siteId],
        state.sites[siteNote.siteId],
      );
    });

    builder.addCase(updateSiteNote.fulfilled, (state, {payload: siteNote}) => {
      state.sites[siteNote.siteId].notes[siteNote.id] = siteNote;
      markEntityModified(state.siteSync, siteNote.siteId, Date.now());
      logSyncChange(
        'updateSiteNote',
        'site',
        siteNote.siteId,
        state.siteSync[siteNote.siteId],
        state.sites[siteNote.siteId],
      );
    });
  },
});

export const {setSiteElevation} = siteSlice.actions;
export default siteSlice.reducer;
