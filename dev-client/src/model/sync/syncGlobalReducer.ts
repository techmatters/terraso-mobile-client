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

import {setUsers} from 'terraso-client-shared/account/accountSlice';
import type {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import * as syncService from 'terraso-client-shared/soilId/syncService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {setLastPullTimestamp} from 'terraso-mobile-client/model/devOnly/devOnlySlice';
import {setExportTokens} from 'terraso-mobile-client/model/export/exportSlice';
import {setProjects} from 'terraso-mobile-client/model/project/projectSlice';
import {setSites} from 'terraso-mobile-client/model/site/siteSlice';
import {
  setProjectSettings,
  setSoilData,
  updateSoilIdStatus,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {setSoilMetadata} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import * as syncActions from 'terraso-mobile-client/model/sync/actions/syncActions';
import {
  initialRecord,
  isUnsynced,
  markEntitesSynced,
  markEntitiesError,
  markEntitiesModified,
} from 'terraso-mobile-client/model/sync/records';
import {
  applySyncResults,
  getValuesForCurrentRevisions,
} from 'terraso-mobile-client/model/sync/results';
import {logSyncSummary} from 'terraso-mobile-client/model/sync/syncDebugLog';
import {createGlobalReducer} from 'terraso-mobile-client/store/reducers';

export const pullUserData = createAsyncThunk(
  'sync/pullUserData',
  syncService.pullUserData,
);

export const pushUserData = createAsyncThunk(
  'sync/pushUserData',
  syncActions.pushUserData,
);

export const syncGlobalReducer = createGlobalReducer(builder => {
  builder.addCase(pullUserData.fulfilled, (state, {payload}) => {
    if (syncDebugEnabled) {
      console.log(
        '⬇️ pull fulfilled:',
        Object.keys(payload.sites).length,
        'sites,',
        Object.keys(payload.soilData).length,
        'soilData,',
        Object.keys(payload.soilMetadata).length,
        'soilMetadata',
      );
    }
    setProjects(state.project, payload.projects);
    setSites(state.site, payload.sites);
    setUsers(state.account, payload.users);
    setProjectSettings(state.soilData, payload.projectSoilSettings);
    setSoilData(state.soilData, payload.soilData);
    setSoilMetadata(state.soilMetadata, payload.soilMetadata);
    setExportTokens(state.export, payload.exportTokens);
    updateSoilIdStatus(state.soilData, 'ready');
    setLastPullTimestamp(state.devOnly, Date.now());

    // Mark sites missing elevation as needing sync so their elevation
    // is fetched and pushed on the next push.
    // Unsynced sites will already have been marked modified.
    const sitesNeedingElevation = Object.keys(payload.sites).filter(id => {
      const siteSync = state.site.siteSync[id];
      return (
        (payload.sites[id].elevation === null ||
          payload.sites[id].elevation === undefined) &&
        !isUnsynced(siteSync ?? initialRecord(undefined))
      );
    });
    if (syncDebugEnabled) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        `- ${sitesNeedingElevation.length} sites still need elevation after pull:`,
      );
      sitesNeedingElevation.forEach(siteToPrint => {
        console.log(payload.sites[siteToPrint].name);
      });
    }
    if (sitesNeedingElevation.length > 0) {
      markEntitiesModified(
        state.site.siteSync,
        sitesNeedingElevation,
        Date.now(),
      );
    }
  });

  builder.addCase(pullUserData.pending, () => {
    if (syncDebugEnabled) {
      console.log('⬇️ pull pending...');
    }
  });

  builder.addCase(pullUserData.rejected, (_state, action) => {
    console.error('⬇️ pull rejected:', action.error);
  });

  builder.addCase(pushUserData.fulfilled, (state, action) => {
    const {siteResults, noteResults, soilDataResults, soilMetadataResults} =
      action.payload;
    const now = Date.now();
    if (syncDebugEnabled) {
      const fmt = (r?: {data: object; errors: object}) =>
        r
          ? `${Object.keys(r.data).length} ok, ${Object.keys(r.errors).length} err`
          : 'none';
      console.log(
        '⬆️ push fulfilled:',
        'sites:',
        fmt(siteResults),
        'notes:',
        fmt(noteResults),
        'soilData:',
        fmt(soilDataResults),
        'soilMetadata:',
        fmt(soilMetadataResults),
      );
    }

    if (siteResults) {
      applySyncResults(
        state.site.sites as Record<string, Site>,
        state.site.siteSync,
        siteResults,
        now,
      );
    }

    if (noteResults) {
      // Notes live nested inside sites, so we handle sync results manually
      const upToDateData = getValuesForCurrentRevisions(
        state.site.noteSync,
        noteResults.data,
      );
      const upToDateErrors = getValuesForCurrentRevisions(
        state.site.noteSync,
        noteResults.errors,
      );

      markEntitesSynced(state.site.noteSync, upToDateData, now);
      for (const [noteId, synced] of Object.entries(upToDateData)) {
        const note = synced.value as SiteNote;
        if (
          state.site.sites[note.siteId] &&
          noteId in (state.site.sites[note.siteId] as Site).notes
        ) {
          // Note still exists locally — update with server data
          (state.site.sites[note.siteId] as Site).notes[noteId] = note;
        } else {
          // Deleted note — remove sync record
          delete state.site.noteSync[noteId];
        }
      }

      markEntitiesError(state.site.noteSync, upToDateErrors, now);
    }

    if (soilDataResults) {
      applySyncResults(
        state.soilData.soilData as Record<string, SoilData>,
        state.soilData.soilSync,
        soilDataResults,
        now,
      );
    }

    if (soilMetadataResults) {
      applySyncResults(
        state.soilMetadata.soilMetadata as Record<string, SoilMetadata>,
        state.soilMetadata.soilMetadataSync,
        soilMetadataResults,
        now,
      );
    }

    logSyncSummary(
      'pushResult',
      'site',
      state.site.siteSync,
      state.site.sites as Record<string, unknown>,
    );
    logSyncSummary(
      'pushResult',
      'note',
      state.site.noteSync,
      {} as Record<string, unknown>,
    );
    logSyncSummary(
      'pushResult',
      'soilData',
      state.soilData.soilSync,
      state.soilData.soilData as Record<string, unknown>,
    );
    logSyncSummary(
      'pushResult',
      'soilMetadata',
      state.soilMetadata.soilMetadataSync,
      state.soilMetadata.soilMetadata as Record<string, unknown>,
    );
  });

  builder.addCase(pushUserData.rejected, (_state, action) => {
    console.error('⬆️ push rejected:', action.error);
  });
});
