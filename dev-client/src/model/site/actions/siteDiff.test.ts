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

import {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';

import {SITE_UPDATE_FIELDS} from 'terraso-mobile-client/model/site/actions/localSiteActions';
import {
  getChangedSiteFields,
  getDeletedNotes,
  getNewNotes,
  getUpdatedNotes,
} from 'terraso-mobile-client/model/site/actions/siteDiff';

const makeSite = (overrides: Partial<Site> = {}): Site => ({
  id: 'site-1',
  name: 'Test Site',
  latitude: 1.0,
  longitude: 2.0,
  elevation: null,
  privacy: 'PRIVATE',
  archived: false,
  updatedAt: '2024-01-01T00:00:00Z',
  notes: {},
  ...overrides,
});

const makeNote = (overrides: Partial<SiteNote> = {}): SiteNote => ({
  id: 'note-1',
  content: 'Test note',
  authorId: 'user-1',
  authorFirstName: 'Alice',
  authorLastName: 'Smith',
  siteId: 'site-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('site diff', () => {
  describe('getChangedSiteFields', () => {
    test('returns all fields when no previous record', () => {
      const curr = makeSite();
      const changed = getChangedSiteFields(curr, undefined);
      for (const field of SITE_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    // As of April 2026 you cannot change an existing site's lat/long, but keeping this test just in case
    test('returns all changed fields when all differ', () => {
      const curr = makeSite({
        name: 'New',
        latitude: 9,
        longitude: 8,
        elevation: 100,
        privacy: 'PUBLIC',
      });
      const prev = makeSite({
        name: 'Old',
        latitude: 1,
        longitude: 2,
        elevation: null,
        privacy: 'PRIVATE',
      });
      const changed = getChangedSiteFields(curr, prev);
      for (const field of SITE_UPDATE_FIELDS) {
        expect(Object.keys(changed)).toContain(field);
        expect(changed[field]).toEqual(curr[field]);
      }
    });

    test('returns only changed fields', () => {
      const curr = makeSite({name: 'New Name'});
      const prev = makeSite({name: 'Old Name'});
      const changed = getChangedSiteFields(curr, prev);
      expect(changed).toEqual({name: 'New Name'});
    });

    test('returns empty object when nothing changed', () => {
      const curr = makeSite();
      const prev = makeSite();
      const changed = getChangedSiteFields(curr, prev);
      expect(changed).toEqual({});
    });
  });

  describe('getNewNotes', () => {
    test('returns all notes when no previous record', () => {
      const note = makeNote({id: 'note-1'});
      const result = getNewNotes({'note-1': note}, undefined);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('note-1');
    });

    test('returns empty array when no new notes', () => {
      const note = makeNote({id: 'note-1'});
      const result = getNewNotes({'note-1': note}, {'note-1': note});
      expect(result).toEqual([]);
    });

    test('returns only notes whose IDs are absent from prev', () => {
      const existing = makeNote({id: 'existing'});
      const newNote = makeNote({id: 'new-one'});
      const result = getNewNotes(
        {existing: existing, 'new-one': newNote},
        {existing: existing},
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('new-one');
    });
  });

  describe('getUpdatedNotes', () => {
    test('returns empty array when no previous record', () => {
      const note = makeNote({id: 'note-1', content: 'Hello'});
      const result = getUpdatedNotes({'note-1': note}, undefined);
      expect(result).toEqual([]);
    });

    test('returns empty array when content is unchanged', () => {
      const note = makeNote({id: 'note-1', content: 'Same'});
      const result = getUpdatedNotes({'note-1': note}, {'note-1': note});
      expect(result).toEqual([]);
    });

    test('returns only notes with changed content', () => {
      const prev = makeNote({id: 'note-1', content: 'Old'});
      const curr = makeNote({id: 'note-1', content: 'New'});
      const result = getUpdatedNotes({'note-1': curr}, {'note-1': prev});
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('New');
    });

    test('does not return notes that only appear in curr (new notes)', () => {
      const newNote = makeNote({id: 'note-new', content: 'Brand new'});
      const result = getUpdatedNotes({'note-new': newNote}, {});
      expect(result).toEqual([]);
    });
  });

  describe('getDeletedNotes', () => {
    test('returns empty array when no previous record', () => {
      const note = makeNote({id: 'note-1'});
      const result = getDeletedNotes({'note-1': note}, undefined);
      expect(result).toEqual([]);
    });

    test('returns empty array when no notes deleted', () => {
      const note = makeNote({id: 'note-1'});
      const result = getDeletedNotes({'note-1': note}, {'note-1': note});
      expect(result).toEqual([]);
    });

    test('returns notes present in prev but absent from curr', () => {
      const deleted = makeNote({id: 'note-del'});
      const kept = makeNote({id: 'note-keep'});
      const result = getDeletedNotes(
        {'note-keep': kept},
        {'note-keep': kept, 'note-del': deleted},
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('note-del');
    });

    test('does not return notes that only appear in curr (new notes)', () => {
      const newNote = makeNote({id: 'note-new'});
      const result = getDeletedNotes({'note-new': newNote}, {});
      expect(result).toEqual([]);
    });
  });
});
