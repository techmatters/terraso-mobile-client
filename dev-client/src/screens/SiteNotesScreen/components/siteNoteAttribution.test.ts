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

import {DELETED_USER_ID} from 'terraso-client-shared/account/authConstants';
import {SiteNote} from 'terraso-client-shared/site/siteTypes';

import {siteNoteAttribution} from 'terraso-mobile-client/screens/SiteNotesScreen/components/siteNoteAttribution';

// Asserting on key + params rather than rendered text: formatDate goes through
// Intl with the system locale and timezone, so the interpolated date is not
// stable across machines.
const t = jest.fn((key: string) => key);
const mockT = t as unknown as TFunction;

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

test('uses the dedicated sentence for a deleted author', () => {
  // The stub carries an English name; asserting exact params proves it never
  // reaches the template.
  const stub = note({
    authorId: DELETED_USER_ID,
    authorFirstName: 'Deleted',
    authorLastName: 'User',
  });
  siteNoteAttribution(stub, undefined, mockT);
  expect(t).toHaveBeenCalledWith('site.notes.note_attribution_deleted_author', {
    createdAt: expect.any(String),
  });
});

test('interpolates the real name for a live author', () => {
  siteNoteAttribution(note(), undefined, mockT);
  expect(t).toHaveBeenCalledWith('site.notes.note_attribution', {
    createdAt: expect.any(String),
    name: 'Alice Smith',
  });
});

test('falls back to the obscured email when the author has no name', () => {
  const nameless = note({authorFirstName: '', authorLastName: ''});
  siteNoteAttribution(nameless, 'alice@example.com', mockT);
  expect(t).toHaveBeenCalledWith('site.notes.note_attribution', {
    createdAt: expect.any(String),
    name: 'a...e@example.com',
  });
});

// Locally-created notes use '' when no current user is resolved
// (localSiteActions.createSiteNote) — that is not a deleted author.
test('does not treat an empty author id as deleted', () => {
  const local = note({
    authorId: '',
    authorFirstName: 'Bob',
    authorLastName: 'Jones',
  });
  siteNoteAttribution(local, undefined, mockT);
  expect(t).toHaveBeenCalledWith('site.notes.note_attribution', {
    createdAt: expect.any(String),
    name: 'Bob Jones',
  });
});
