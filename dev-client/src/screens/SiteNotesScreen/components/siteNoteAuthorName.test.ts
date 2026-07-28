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

import {DELETED_USER_ID} from 'terraso-client-shared/account/authConstants';
import {SiteNote} from 'terraso-client-shared/site/siteTypes';

import {siteNoteAuthorDisplayName} from 'terraso-mobile-client/screens/SiteNotesScreen/components/siteNoteAuthorName';

const DELETED_LABEL = 'Usuario eliminado';

const note = (overrides: Partial<SiteNote> = {}): SiteNote => ({
  id: 'note-1',
  siteId: 'site-1',
  content: 'This is a note',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  authorId: 'a3f1c9d4-5e6b-4a72-9c81-2d0e7b4f8a15',
  authorFirstName: 'Alice',
  authorLastName: 'Smith',
  ...overrides,
});

test('uses the localized label for the deleted-user stub', () => {
  // The stub arrives with the English name attached; the label must win.
  const stub = note({
    authorId: DELETED_USER_ID,
    authorFirstName: 'Deleted',
    authorLastName: 'User',
  });
  expect(siteNoteAuthorDisplayName(stub, undefined, DELETED_LABEL)).toBe(
    DELETED_LABEL,
  );
});

test('uses the real name for a live author', () => {
  expect(siteNoteAuthorDisplayName(note(), undefined, DELETED_LABEL)).toBe(
    'Alice Smith',
  );
});

test('falls back to the obscured email when the author has no name', () => {
  const nameless = note({authorFirstName: '', authorLastName: ''});
  expect(
    siteNoteAuthorDisplayName(nameless, 'alice@example.com', DELETED_LABEL),
  ).toBe('a...e@example.com');
});

// Locally-created notes use '' when no current user is resolved
// (localSiteActions.createSiteNote) — that is not a deleted author.
test('does not treat an empty author id as deleted', () => {
  const local = note({
    authorId: '',
    authorFirstName: 'Bob',
    authorLastName: 'Jones',
  });
  expect(siteNoteAuthorDisplayName(local, undefined, DELETED_LABEL)).toBe(
    'Bob Jones',
  );
});
