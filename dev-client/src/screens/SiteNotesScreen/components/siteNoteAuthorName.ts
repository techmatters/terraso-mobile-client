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

import {isDeletedUser} from 'terraso-client-shared/account/authConstants';
import {SiteNote} from 'terraso-client-shared/site/siteTypes';

import {formatFullName} from 'terraso-mobile-client/util';

/**
 * Display name for a note's author.
 *
 * The backend substitutes a stub user (sentinel id, English name "Deleted
 * User") when the author's account has been deleted, so the localized label
 * has to win over the stub's name. Takes the label rather than `t` to stay
 * pure and unit-testable.
 */
export const siteNoteAuthorDisplayName = (
  note: SiteNote,
  authorEmail: string | undefined,
  deletedUserLabel: string,
) =>
  isDeletedUser(note.authorId)
    ? deletedUserLabel
    : formatFullName(note.authorFirstName, note.authorLastName, authorEmail);
