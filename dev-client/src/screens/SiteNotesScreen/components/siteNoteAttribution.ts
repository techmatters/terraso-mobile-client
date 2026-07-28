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

import {TFunction} from 'i18next';

import {isDeletedUser} from 'terraso-client-shared/account/authConstants';
import {SiteNote} from 'terraso-client-shared/site/siteTypes';

import {formatDate, formatFullName} from 'terraso-mobile-client/util';

/**
 * Attribution line for a site note, e.g. "7/28/2026 12:37 by Alice Smith".
 *
 * A deleted author gets its own complete sentence rather than a label
 * interpolated into the normal template. Two reasons: the backend's stub name
 * is English, and a substituted noun phrase can't inflect to agree with the
 * surrounding sentence in case-marking languages (uk instrumental, ka
 * genitive).
 */
export const siteNoteAttribution = (
  note: SiteNote,
  authorEmail: string | undefined,
  t: TFunction,
) => {
  const createdAt = formatDate(note.createdAt);
  return isDeletedUser(note.authorId)
    ? t('site.notes.note_attribution_deleted_author', {createdAt})
    : t('site.notes.note_attribution', {
        createdAt,
        name: formatFullName(
          note.authorFirstName,
          note.authorLastName,
          authorEmail,
        ),
      });
};
