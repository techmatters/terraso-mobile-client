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

import {
  applySyncActionResults,
  applySyncResultsData,
  ChangeRecords,
  ChangeTimestamp,
  getChanges,
  getResultsForCurrentRevisions,
  getSyncedRecords,
  getSyncResultsData,
  getUnsyncedRecords,
  isUnsynced,
  markChanged,
  markSynced,
  nextRevisionId,
  removeResultsKeys,
  SyncActionResults,
} from 'terraso-mobile-client/model/sync/sync';

describe('sync', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
  });

  describe('nextRevisionId', () => {
    test('assumes zero initial value', () => {
      expect(nextRevisionId(undefined)).toEqual(1);
    });

    test('increments by one', () => {
      expect(nextRevisionId(1)).toEqual(2);
    });
  });

  describe('getChanges', () => {
    test('returns changes for ids', () => {
      const changes = {a: {revisionId: 1}, b: {revisionId: 2}};
      expect(getChanges(changes, ['a'])).toEqual({a: {revisionId: 1}});
    });

    test('returns empty changes when missing', () => {
      const changes = {};
      expect(getChanges(changes, ['a'])).toEqual({a: {}});
    });
  });

  describe('markChanged', () => {
    let changes: ChangeRecords<unknown>;

    beforeEach(() => {
      changes = {};
    });

    test('initializes change record if not present', () => {
      markChanged(changes, 'a', Date.now());
      expect(changes.a).toBeDefined();
    });

    test('initializes revision id if not present', () => {
      changes.a = {};
      markChanged(changes, 'a', Date.now());
      expect(changes.a.revisionId).toEqual(1);
    });

    test('increments revision id', () => {
      changes.a = {revisionId: 122};
      markChanged(changes, 'a', Date.now());
      expect(changes.a.revisionId).toEqual(123);
    });

    test('records modified date', () => {
      const at = Date.now();
      markChanged(changes, 'a', at);
      expect(changes.a.lastModifiedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      changes.a = {
        lastSyncedRevisionId: 100,
        lastSyncedData: 'data',
        lastSyncedAt: 10000,
      };
      markChanged(changes, 'a', Date.now());
      expect(changes.a.lastSyncedRevisionId).toEqual(100);
      expect(changes.a.lastSyncedData).toEqual('data');
      expect(changes.a.lastSyncedAt).toEqual(10000);
    });
  });

  describe('markSynced', () => {
    let changes: ChangeRecords<unknown>;

    beforeEach(() => {
      changes = {};
    });

    test('initializes change record if not present', () => {
      markSynced(changes, 'a', {data: 'data'}, Date.now());
      expect(changes.a).toBeDefined();
    });

    test('records synced revision id', () => {
      markSynced(changes, 'a', {revisionId: 123, data: 'data'}, Date.now());
      expect(changes.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records synced data', () => {
      markSynced(changes, 'a', {data: 'data'}, Date.now());
      expect(changes.a.lastSyncedData).toEqual('data');
    });

    test('records synced date', () => {
      const at = Date.now();
      markSynced(changes, 'a', {data: 'data'}, at);
      expect(changes.a.lastSyncedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      changes.a = {
        revisionId: 100,
        lastModifiedAt: 10000,
      };
      markSynced(changes, 'a', {data: 'data'}, Date.now());
      expect(changes.a.revisionId).toEqual(100);
      expect(changes.a.lastModifiedAt).toEqual(10000);
    });
  });

  describe('getSyncedRecords', () => {
    test('returns synced records', () => {
      const changes = {
        a: {revisionId: 1, lastSyncedRevisionId: 0},
        b: {revisionId: 1, lastSyncedRevisionId: 1},
      };
      expect(getSyncedRecords(changes)).toEqual({
        b: {revisionId: 1, lastSyncedRevisionId: 1},
      });
    });
  });

  describe('getUnsyncedRecords', () => {
    test('returns un-synced records', () => {
      const changes = {
        a: {revisionId: 1, lastSyncedRevisionId: 0},
        b: {revisionId: 1, lastSyncedRevisionId: 1},
      };
      expect(getUnsyncedRecords(changes)).toEqual({
        a: {revisionId: 1, lastSyncedRevisionId: 0},
      });
    });
  });

  describe('isUnsynced', () => {
    test('returns synced for empty records', () => {
      expect(isUnsynced({})).toBeFalsy();
    });

    test('returns synced for records with matching revision ids', () => {
      expect(
        isUnsynced({
          revisionId: 10,
          lastSyncedRevisionId: 10,
        }),
      ).toBeFalsy();
    });

    test('returns unsynced for records without matching revision ids', () => {
      expect(
        isUnsynced({
          revisionId: 10,
          lastSyncedRevisionId: 9,
        }),
      ).toBeTruthy();
    });

    test('returns unsynced for never-synced records', () => {
      expect(
        isUnsynced({
          revisionId: 10,
        }),
      ).toBeTruthy();
    });
  });

  describe('applySyncActionResults', () => {
    let data: Record<string, any>;
    let errors: Record<string, any>;
    let records: ChangeRecords<any>;
    let results: SyncActionResults<any, any>;
    let at: ChangeTimestamp;

    beforeEach(() => {
      data = {};
      errors = {};
      records = {};
      results = {
        data: {},
        errors: {},
      };
      at = Date.now();
    });

    test('marks records as synced', () => {
      records.a = {
        revisionId: 1,
        lastSyncedRevisionId: 0,
      };
      results.data.a = {revisionId: 1, data: 'new data'};
      applySyncActionResults(data, errors, records, results, at);
      expect(isUnsynced(records.a)).toBeFalsy();
    });

    test('does not mark stale records as synced', () => {
      records.a = {
        revisionId: 2,
        lastSyncedRevisionId: 0,
      };
      results.data.a = {revisionId: 1, data: 'new data'};
      applySyncActionResults(data, errors, records, results, at);
      expect(isUnsynced(records.a)).toBeTruthy();
    });

    test('records new data', () => {
      results.data.a = {data: 'new data'};
      applySyncActionResults(data, errors, records, results, at);
      expect(data.a).toEqual('new data');
    });

    test('does not record stale data', () => {
      data.a = 'existing data';
      results.data.a = {revisionId: 1, data: 'new error'};
      records.a = {revisionId: 2};
      applySyncActionResults(data, errors, records, results, at);
      expect(data.a).toEqual('existing data');
    });

    test('clears old errors on success', () => {
      results.data.a = {data: 'new data'};
      errors.a = 'existing error';
      applySyncActionResults(data, errors, records, results, at);
      expect(errors.a).toBeUndefined();
    });

    test('records new errors', () => {
      results.errors.a = {data: 'new error'};
      applySyncActionResults(data, errors, records, results, at);
      expect(errors.a).toEqual('new error');
    });

    test('does not record stale errors', () => {
      errors.a = 'existing error';
      results.errors.a = {revisionId: 1, data: 'new error'};
      records.a = {revisionId: 2};
      applySyncActionResults(data, errors, records, results, at);
      expect(errors.a).toEqual('existing error');
    });
  });

  describe('getResultsForCurrentRevisions', () => {
    test('returns results with matching revision IDs', () => {
      expect(
        getResultsForCurrentRevisions(
          {a: {revisionId: 1}, b: {revisionId: 1}, c: {revisionId: 2}},
          {
            a: {revisionId: 2, data: 'data'},
            b: {revisionId: 1, data: 'data'},
            c: {revisionId: 1, data: 'data'},
          },
        ),
      ).toEqual({b: {revisionId: 1, data: 'data'}});
    });

    test('handles results with no change records', () => {
      expect(
        getResultsForCurrentRevisions(
          {},
          {
            a: {revisionId: undefined, data: 'data'},
            b: {revisionId: 1, data: 'data'},
          },
        ),
      ).toEqual({a: {revisionId: undefined, data: 'data'}});
    });
  });

  describe('applySyncResultsData', () => {
    test('assigns data from sync results', () => {
      const data = {a: 'old data', b: 'other data'};
      applySyncResultsData(data, {
        a: {
          data: 'data',
        },
      });
      expect(data).toEqual({a: 'data', b: 'other data'});
    });
  });

  describe('getSyncResultsData', () => {
    test('returns data from sync results', () => {
      expect(
        getSyncResultsData({
          a: {
            data: 'data',
          },
        }),
      ).toEqual({a: 'data'});
    });
  });

  describe('removeResults', () => {
    test('removes specified ids', () => {
      const data = {a: 1, b: 2};
      const results = {a: {data: 'something'}};
      removeResultsKeys(data, results);
      expect(Object.keys(data)).toEqual(['b']);
    });

    test('handles missing ids', () => {
      const data = {b: 2};
      const results = {a: {data: 'something'}};
      removeResultsKeys(data, results);
      expect(Object.keys(data)).toEqual(['b']);
    });
  });
});
