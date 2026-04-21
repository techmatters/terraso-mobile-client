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

import {ProjectManagementSitePrivacyChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {Site, SiteNote} from 'terraso-client-shared/site/siteTypes';

import {
  siteMutationResponseToResults,
  SitePushFailureReason,
  unsyncedSitesToMutationInput,
} from 'terraso-mobile-client/model/site/actions/remoteSiteActions';
import {SyncRecords} from 'terraso-mobile-client/model/sync/records';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

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

const makeUnsyncedChanges = (
  entries: Record<
    string,
    Partial<SyncRecords<Site, SitePushFailureReason>[string]>
  >,
): SyncRecords<Site, SitePushFailureReason> => entries as any;

// ---------------------------------------------------------------------------
// unsyncedSitesToMutationInput
// ---------------------------------------------------------------------------

describe('unsyncedSitesToMutationInput', () => {
  test('new site — all required fields present, no note diffs', () => {
    const site = makeSite({id: 'site-1'});
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1, lastSyncedData: undefined},
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': site,
    });

    expect(result).toHaveLength(1);
    const entry = result[0];
    expect(entry.siteId).toBe('site-1');
    expect(entry.isNew).toBe(true);
    expect(entry.name).toBe('Test Site');
    expect(entry.latitude).toBe(1.0);
    expect(entry.longitude).toBe(2.0);
    expect(entry.newNotes).toEqual([]);
    expect(entry.updatedNotes).toEqual([]);
    expect(entry.deletedNoteIds).toEqual([]);
  });

  test('new site — notes become newNotes', () => {
    const note = makeNote({id: 'note-1', content: 'Hello'});
    const site = makeSite({notes: {'note-1': note}});
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1, lastSyncedData: undefined},
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': site,
    });

    expect(result[0].newNotes).toEqual([{id: 'note-1', content: 'Hello'}]);
    expect(result[0].updatedNotes).toEqual([]);
    expect(result[0].deletedNoteIds).toEqual([]);
  });

  test('existing site — only changed fields included', () => {
    const prevSite = makeSite({name: 'Old Name'});
    const currSite = makeSite({name: 'New Name'});
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 2, lastSyncedData: prevSite},
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': currSite,
    });

    expect(result[0].isNew).toBe(false);
    expect(result[0].name).toBe('New Name');
    // latitude/longitude unchanged — should not appear (diffFields omits unchanged)
    expect(result[0].latitude).toBeUndefined();
  });

  test('existing site — note added, updated, deleted', () => {
    const prevNote = makeNote({id: 'note-keep', content: 'Keep'});
    const updatedNote = makeNote({id: 'note-edit', content: 'Updated content'});
    const prevEditNote = makeNote({
      id: 'note-edit',
      content: 'Original content',
    });
    const deletedNote = makeNote({id: 'note-del', content: 'Gone'});
    const newNote = makeNote({id: 'note-new', content: 'Brand new'});

    const prevSite = makeSite({
      notes: {
        'note-keep': prevNote,
        'note-edit': prevEditNote,
        'note-del': deletedNote,
      },
    });
    const currSite = makeSite({
      notes: {
        'note-keep': prevNote,
        'note-edit': updatedNote,
        'note-new': newNote,
        // note-del is gone
      },
    });
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 2, lastSyncedData: prevSite},
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': currSite,
    });

    expect(result[0].newNotes).toEqual([
      {id: 'note-new', content: 'Brand new'},
    ]);
    expect(result[0].updatedNotes).toEqual([
      {id: 'note-edit', content: 'Updated content'},
    ]);
    expect(result[0].deletedNoteIds).toEqual(['note-del']);
  });

  test('new site — null elevation remains null', () => {
    const site = makeSite({id: 'site-1', elevation: null});
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1, lastSyncedData: undefined},
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': site,
    });

    expect(result[0].elevation).toBeNull();
  });

  test('existing site — no changed fields, empty note arrays', () => {
    const site = makeSite();
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 2, lastSyncedData: makeSite()},
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': site,
    });

    expect(result).toHaveLength(1);
    expect(result[0].isNew).toBe(false);
    expect(result[0].name).toBeUndefined();
    expect(result[0].newNotes).toEqual([]);
    expect(result[0].updatedNotes).toEqual([]);
    expect(result[0].deletedNoteIds).toEqual([]);
  });

  test('multiple sites — one new, one existing', () => {
    const site1 = makeSite({id: 'site-1'});
    const site2 = makeSite({id: 'site-2', name: 'Renamed'});
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1, lastSyncedData: undefined},
      'site-2': {
        revisionId: 2,
        lastSyncedData: makeSite({id: 'site-2', name: 'Old'}),
      },
    });

    const result = unsyncedSitesToMutationInput(unsyncedChanges, {
      'site-1': site1,
      'site-2': site2,
    });

    expect(result).toHaveLength(2);
    const byId = Object.fromEntries(result.map(e => [e.siteId, e]));
    expect(byId['site-1'].isNew).toBe(true);
    expect(byId['site-2'].isNew).toBe(false);
    expect(byId['site-2'].name).toBe('Renamed');
  });
});

// ---------------------------------------------------------------------------
// siteMutationResponseToResults
// ---------------------------------------------------------------------------

describe('siteMutationResponseToResults', () => {
  const baseSiteFragment = {
    id: 'site-1',
    name: 'Test Site',
    latitude: 1.0,
    longitude: 2.0,
    elevation: null,
    archived: false,
    updatedAt: '2024-01-01T00:00:00Z',
    privacy: 'PRIVATE' as ProjectManagementSitePrivacyChoices,
    owner: {id: 'user-1'},
    project: null,
    notes: {edges: []},
  };

  test('success result populates data, not errors', () => {
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1},
    });
    const siteResults = [
      {
        siteId: 'site-1',
        result: {
          __typename: 'SitePushEntrySuccess' as const,
          site: baseSiteFragment,
        },
      },
    ];

    const results = siteMutationResponseToResults(unsyncedChanges, siteResults);

    expect(Object.keys(results.data)).toContain('site-1');
    expect(Object.keys(results.errors)).toHaveLength(0);
    expect(results.data['site-1'].revisionId).toBe(1);
    expect(results.data['site-1'].value.id).toBe('site-1');
  });

  test('failure result populates errors, not data', () => {
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1},
    });
    const siteResults = [
      {
        siteId: 'site-1',
        result: {
          __typename: 'SitePushEntryFailure' as const,
          reason: 'SITE_DOES_NOT_EXIST' as SitePushFailureReason,
        },
      },
    ];

    const results = siteMutationResponseToResults(unsyncedChanges, siteResults);

    expect(Object.keys(results.errors)).toContain('site-1');
    expect(Object.keys(results.data)).toHaveLength(0);
    expect(results.errors['site-1'].value).toBe('SITE_DOES_NOT_EXIST');
    expect(results.errors['site-1'].revisionId).toBe(1);
  });

  test('mixed results — some success, some failure', () => {
    const unsyncedChanges = makeUnsyncedChanges({
      'site-1': {revisionId: 1},
      'site-2': {revisionId: 2},
    });
    const siteResults = [
      {
        siteId: 'site-1',
        result: {
          __typename: 'SitePushEntrySuccess' as const,
          site: baseSiteFragment,
        },
      },
      {
        siteId: 'site-2',
        result: {
          __typename: 'SitePushEntryFailure' as const,
          reason: 'NOT_ALLOWED' as SitePushFailureReason,
        },
      },
    ];

    const results = siteMutationResponseToResults(unsyncedChanges, siteResults);

    expect(Object.keys(results.data)).toContain('site-1');
    expect(Object.keys(results.errors)).toContain('site-2');
    expect(results.errors['site-2'].value).toBe('NOT_ALLOWED');
  });

  test('empty response produces empty results', () => {
    const results = siteMutationResponseToResults(makeUnsyncedChanges({}), []);
    expect(Object.keys(results.data)).toHaveLength(0);
    expect(Object.keys(results.errors)).toHaveLength(0);
  });
});
