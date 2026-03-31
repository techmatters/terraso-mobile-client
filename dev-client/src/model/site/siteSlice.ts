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
import {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import * as siteActions from 'terraso-mobile-client/model/site/actions/siteActions';
import {
  getUnsyncedRecords,
  initialRecord,
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
  siteSync: {} as SyncRecords<Site, string>,
  noteSync: {} as SyncRecords<SiteNote, string>,
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

  // Save unsynced notes before site merge (which may overwrite synced sites)
  const unsyncedNoteRecords = getUnsyncedRecords(state.noteSync);
  const localNotes: Record<string, SiteNote> = {};
  for (const site of Object.values(state.sites)) {
    for (const [noteId, note] of Object.entries(site.notes)) {
      if (noteId in unsyncedNoteRecords) {
        localNotes[noteId] = note as SiteNote;
      }
    }
  }

  // Merge sites
  const {mergedRecords, mergedData} = mergeUnsyncedEntities(
    state.siteSync,
    state.sites,
    sites,
  );

  // Build noteSync from merged sites (all notes start as synced)
  const newNoteSync: SyncRecords<SiteNote, string> = {};
  for (const site of Object.values(mergedData)) {
    for (const [noteId, note] of Object.entries(site.notes)) {
      newNoteSync[noteId] = initialRecord(note as SiteNote);
    }
  }

  // Overlay unsynced note records and their data
  for (const [noteId, record] of Object.entries(unsyncedNoteRecords)) {
    newNoteSync[noteId] = record;
    if (localNotes[noteId]) {
      // New or updated note — restore in merged site
      const siteId = localNotes[noteId].siteId;
      if (mergedData[siteId]) {
        (mergedData[siteId] as Site).notes[noteId] = localNotes[noteId];
      }
    } else if (record.lastSyncedData) {
      // Deleted note — remove from merged site
      const siteId = (record.lastSyncedData as SiteNote).siteId;
      if (mergedData[siteId]) {
        delete (mergedData[siteId] as Site).notes[noteId];
      }
    }
  }

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
  state.noteSync = newNoteSync;
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
    // Clean up noteSync records for notes belonging to this site
    if (state.sites[siteId]) {
      for (const noteId of Object.keys(state.sites[siteId].notes)) {
        delete state.noteSync[noteId];
      }
    }
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
      markEntityModified(state.noteSync, siteNote.id, Date.now());
      logSyncChange(
        'addSiteNote',
        'note',
        siteNote.id,
        state.noteSync[siteNote.id],
        siteNote,
      );
    });

    builder.addCase(deleteSiteNote.fulfilled, (state, {payload: siteNote}) => {
      delete state.sites[siteNote.siteId].notes[siteNote.id];
      markEntityModified(state.noteSync, siteNote.id, Date.now());
      logSyncChange(
        'deleteSiteNote',
        'note',
        siteNote.id,
        state.noteSync[siteNote.id],
        siteNote,
      );
    });

    builder.addCase(updateSiteNote.fulfilled, (state, {payload: siteNote}) => {
      state.sites[siteNote.siteId].notes[siteNote.id] = siteNote;
      markEntityModified(state.noteSync, siteNote.id, Date.now());
      logSyncChange(
        'updateSiteNote',
        'note',
        siteNote.id,
        state.noteSync[siteNote.id],
        siteNote,
      );
    });
  },
});

export const {setSiteElevation} = siteSlice.actions;
export default siteSlice.reducer;
