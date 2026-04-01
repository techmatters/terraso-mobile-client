/*
 * Copyright © 2026 Technology Matters
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

import {collapseSite} from 'terraso-client-shared/site/siteService';
import {Site} from 'terraso-client-shared/site/siteTypes';
import type {
  SitePushEntry,
  SitePushFailureReason,
  SitePushInputEntry,
} from 'terraso-client-shared/soilId/syncTypes.ts';

import {
  getChangedSiteFields,
  getDeletedNotes,
  getNewNotes,
  getUpdatedNotes,
} from 'terraso-mobile-client/model/site/actions/siteDiff';
import {
  getEntityRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {SyncResults} from 'terraso-mobile-client/model/sync/results';

export type {SitePushFailureReason};

/**
 * Converts unsynced site records to the input format expected by the SitePush
 * mutation (sent via UserDataPush). Mirrors the pattern of unsyncedSoilDataToMutationInput.
 */
export const unsyncedSitesToMutationInput = (
  unsyncedChanges: SyncRecords<Site, SitePushFailureReason>,
  unsyncedData: Record<string, Site>,
): SitePushInputEntry[] => {
  return Object.entries(unsyncedData).map(([siteId, site]) => {
    const record = getEntityRecord(unsyncedChanges, siteId);
    const isNew = record.lastSyncedData === undefined;

    const newNotes = getNewNotes(site.notes, record.lastSyncedData?.notes).map(
      n => ({id: n.id, content: n.content}),
    );
    const updatedNotes = getUpdatedNotes(
      site.notes,
      record.lastSyncedData?.notes,
    ).map(n => ({id: n.id, content: n.content}));
    const deletedNoteIds = getDeletedNotes(
      site.notes,
      record.lastSyncedData?.notes,
    ).map(n => n.id);

    if (isNew) {
      return {
        siteId,
        isNew: true,
        name: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        elevation: site.elevation ?? undefined,
        privacy: site.privacy,
        projectId: site.projectId ?? undefined,
        newNotes,
        updatedNotes,
        deletedNoteIds,
      };
    } else {
      const changedFields = getChangedSiteFields(site, record.lastSyncedData);
      return {
        siteId,
        isNew: false,
        ...changedFields,
        newNotes,
        updatedNotes,
        deletedNoteIds,
      };
    }
  });
};

/**
 * Converts SitePush mutation response entries to SyncResults.
 * Mirrors the pattern of soilDataMutationResponseToResults.
 */
export const siteMutationResponseToResults = (
  unsyncedChanges: SyncRecords<Site, SitePushFailureReason>,
  siteResults: SitePushEntry[],
): SyncResults<Site, SitePushFailureReason> => {
  const results: SyncResults<Site, SitePushFailureReason> = {
    data: {},
    errors: {},
  };

  for (const entry of siteResults) {
    const record = getEntityRecord(unsyncedChanges, entry.siteId);
    const revisionId = record.revisionId;

    if (entry.result.__typename === 'SitePushEntrySuccess') {
      results.data[entry.siteId] = {
        revisionId,
        value: collapseSite(entry.result.site),
      };
    } else {
      results.errors[entry.siteId] = {
        revisionId,
        value: entry.result.reason,
      };
    }
  }

  return results;
};
