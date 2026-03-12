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

import {
  SiteAddMutationInput,
  SiteNoteAddMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as siteService from 'terraso-client-shared/site/siteService';
import {Site} from 'terraso-client-shared/site/siteTypes';

import {syncDebugEnabled} from 'terraso-mobile-client/config';
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

export type SitePushFailureReason = string;

/**
 * Pushes unsynced site changes to the server using individual mutations.
 *
 * For each unsynced site:
 * 1. Creates or updates the site (addSite with client UUID, or updateSite with changed fields)
 * 2. Adds new notes (addSiteNote with client UUID) and updates changed notes
 * 3. Fetches the canonical server state for the site
 *
 * Sites are pushed in parallel; failures for one site don't affect others.
 */
export const pushSiteChanges = async (
  unsyncedChanges: SyncRecords<Site, SitePushFailureReason>,
  unsyncedData: Record<string, Site>,
): Promise<SyncResults<Site, SitePushFailureReason>> => {
  const results: SyncResults<Site, SitePushFailureReason> = {
    data: {},
    errors: {},
  };

  const sitePromises = Object.entries(unsyncedData).map(
    async ([siteId, site]) => {
      const record = getEntityRecord(unsyncedChanges, siteId);
      const revisionId = record.revisionId;
      const isNew = record.lastSyncedData === undefined;

      try {
        // 1. Push site-level changes
        if (isNew) {
          // Backend accepts client-generated UUID via optional `id` field.
          // The shared library types haven't been regenerated yet, so we cast.
          if (syncDebugEnabled) {
            console.log(
              `📤 pushSiteChanges: addSite ${site.name} with elevation ${site.elevation}`,
            );
          }
          await siteService.addSite({
            id: siteId,
            name: site.name,
            latitude: site.latitude,
            longitude: site.longitude,
            elevation: site.elevation,
            privacy: site.privacy,
            projectId: site.projectId,
          } as SiteAddMutationInput);
        } else {
          const changedFields = getChangedSiteFields(
            site,
            record.lastSyncedData,
          );
          if (Object.keys(changedFields).length > 0) {
            if (syncDebugEnabled) {
              console.log(
                '📤 pushSiteChanges: updateSite',
                siteId,
                changedFields,
              );
            }
            await siteService.updateSite({
              id: siteId,
              ...changedFields,
            });
          }
        }

        // 2. Push note-level changes
        const newNotes = getNewNotes(site.notes, record.lastSyncedData?.notes);
        const updatedNotes = getUpdatedNotes(
          site.notes,
          record.lastSyncedData?.notes,
        );

        for (const note of newNotes) {
          // Backend accepts client-generated UUID via optional `id` field.
          if (syncDebugEnabled) {
            console.log('📤 pushSiteChanges: addSiteNote', note.id);
          }
          await siteService.addSiteNote({
            id: note.id,
            siteId: siteId,
            content: note.content,
          } as SiteNoteAddMutationInput);
        }

        for (const note of updatedNotes) {
          if (syncDebugEnabled) {
            console.log('📤 pushSiteChanges: updateSiteNote', note.id);
          }
          await siteService.updateSiteNote({
            id: note.id,
            content: note.content,
          });
        }

        const deletedNotes = getDeletedNotes(
          site.notes,
          record.lastSyncedData?.notes,
        );
        for (const note of deletedNotes) {
          if (syncDebugEnabled) {
            console.log('📤 pushSiteChanges: deleteSiteNote', note.id);
          }
          await siteService.deleteSiteNote(note);
        }

        // 3. Fetch canonical server state (includes all notes)
        if (syncDebugEnabled) {
          console.log('📤 pushSiteChanges: fetchSite', siteId);
        }
        const serverSite = await siteService.fetchSite(siteId);

        results.data[siteId] = {
          revisionId,
          value: serverSite,
        };
      } catch (error) {
        results.errors[siteId] = {
          revisionId,
          value: String(error),
        };
      }
    },
  );

  await Promise.allSettled(sitePromises);
  return results;
};
