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

import type {SiteNoteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import * as siteService from 'terraso-client-shared/site/siteService';
import type {SiteNote} from 'terraso-client-shared/site/siteTypes';

import type {SyncRecord} from 'terraso-mobile-client/model/sync/records';

export const pushNote = async (
  noteId: string,
  record: SyncRecord<SiteNote, string>,
  noteData: SiteNote | undefined,
): Promise<SiteNote> => {
  const isNew = record.lastSyncedData === undefined;

  if (isNew) {
    if (!noteData) {
      throw new Error(`Cannot push new note ${noteId}: no note data`);
    }
    // Pass client-generated id for idempotency.
    // Backend accepts id but the TS type doesn't include it yet.
    return siteService.addSiteNote({
      id: noteId,
      siteId: noteData.siteId,
      content: noteData.content,
    } as SiteNoteAddMutationInput);
  }

  if (noteData) {
    // Updated note
    return siteService.updateSiteNote({id: noteId, content: noteData.content});
  }

  // Deleted note (no local data, but lastSyncedData exists)
  try {
    return await siteService.deleteSiteNote(record.lastSyncedData!);
  } catch {
    // Already deleted on server — treat as success
    return record.lastSyncedData!;
  }
};
