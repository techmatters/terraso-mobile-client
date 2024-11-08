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
  getErrorRecords,
  getResultsForCurrentRevisions,
  getSyncRecords,
  getSyncResultsData,
  getUnsyncedRecords,
  initializeSyncRecords,
  isError,
  isUnsynced,
  markError,
  markModified,
  markSynced,
  mergeUnsyncedRecordsWithData,
  SyncActionResults,
  SyncRecords,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/sync';

describe('sync', () => {
  describe('getSyncRecords', () => {
    test('returns records for ids', () => {
      const records = {a: {revisionId: 1}, b: {revisionId: 2}};
      expect(getSyncRecords(records, ['a'])).toEqual({a: {revisionId: 1}});
    });

    test('returns empty records when missing', () => {
      const records = {};
      expect(getSyncRecords(records, ['a'])).toEqual({a: {}});
    });
  });

  describe('markModified', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      markModified(records, 'a', Date.now());
      expect(records.a).toBeDefined();
    });

    test('initializes revision id if not present', () => {
      records.a = {};
      markModified(records, 'a', Date.now());
      expect(records.a.revisionId).toEqual(1);
    });

    test('increments revision id', () => {
      records.a = {revisionId: 122};
      markModified(records, 'a', Date.now());
      expect(records.a.revisionId).toEqual(123);
    });

    test('records modified date', () => {
      const at = Date.now();
      markModified(records, 'a', at);
      expect(records.a.lastModifiedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      records.a = {
        lastSyncedRevisionId: 100,
        lastSyncedData: 'data',
        lastSyncedError: 'error',
        lastSyncedAt: 10000,
      };
      markModified(records, 'a', Date.now());
      expect(records.a.lastSyncedRevisionId).toEqual(100);
      expect(records.a.lastSyncedData).toEqual('data');
      expect(records.a.lastSyncedError).toEqual('error');
      expect(records.a.lastSyncedAt).toEqual(10000);
    });
  });

  describe('markSynced', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      markSynced(records, 'a', {data: 'data'}, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced revision id', () => {
      markSynced(records, 'a', {revisionId: 123, data: 'data'}, Date.now());
      expect(records.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records synced data', () => {
      markSynced(records, 'a', {data: 'data'}, Date.now());
      expect(records.a.lastSyncedData).toEqual('data');
    });

    test('records synced date', () => {
      const at = Date.now();
      markSynced(records, 'a', {data: 'data'}, at);
      expect(records.a.lastSyncedAt).toEqual(at);
    });

    test('clears sync error', () => {
      records.a = {
        lastSyncedError: 'error',
      };
      const at = Date.now();
      markSynced(records, 'a', {data: 'data'}, at);
      expect(records.a.lastSyncedError).toBeUndefined();
    });

    test('preserves other properties', () => {
      records.a = {
        revisionId: 100,
        lastModifiedAt: 10000,
      };
      markSynced(records, 'a', {data: 'data'}, Date.now());
      expect(records.a.revisionId).toEqual(100);
      expect(records.a.lastModifiedAt).toEqual(10000);
    });
  });

  describe('markError', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      markError(records, 'a', {data: 'error'}, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced revision id', () => {
      markError(records, 'a', {revisionId: 123, data: 'data'}, Date.now());
      expect(records.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records error', () => {
      markError(records, 'a', {data: 'error'}, Date.now());
      expect(records.a.lastSyncedError).toEqual('error');
    });

    test('records synced date', () => {
      const at = Date.now();
      markError(records, 'a', {data: 'data'}, at);
      expect(records.a.lastSyncedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      records.a = {
        revisionId: 101,
        lastSyncedData: 'data',
      };
      markError(records, 'a', {data: 'error'}, Date.now());
      expect(records.a.revisionId).toEqual(101);
      expect(records.a.lastSyncedData).toEqual('data');
    });
  });

  describe('getUnsyncedRecords', () => {
    test('returns un-synced records', () => {
      const records = {
        a: {revisionId: 1, lastSyncedRevisionId: 0},
        b: {revisionId: 1, lastSyncedRevisionId: 1},
      };
      expect(getUnsyncedRecords(records)).toEqual({
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

  describe('getErrorRecords', () => {
    test('returns un-synced records', () => {
      const records = {
        a: {lastSyncedError: 'error'},
        b: {lastSyncedError: undefined},
      };
      expect(getErrorRecords(records)).toEqual({
        a: {lastSyncedError: 'error'},
      });
    });
  });

  describe('isError', () => {
    test('returns non error for empty records', () => {
      expect(isError({})).toBeFalsy();
    });

    test('returns error for records with an error value', () => {
      expect(isError({lastSyncedError: 'error'})).toBeTruthy();
    });

    test('returns non error for records without an error value', () => {
      expect(isError({lastSyncedError: undefined})).toBeFalsy();
    });
  });

  describe('applySyncActionResults', () => {
    let data: Record<string, any>;
    let records: SyncRecords<any, any>;
    let results: SyncActionResults<any, any>;
    let at: SyncTimestamp;

    beforeEach(() => {
      data = {};
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
      records.b = {
        revisionId: 1,
        lastSyncedRevisionId: 0,
      };
      results.data.a = {revisionId: 1, data: 'new data'};
      results.errors.b = {revisionId: 1, data: 'new error'};
      applySyncActionResults(data, records, results, at);
      expect(isUnsynced(records.a)).toBeFalsy();
      expect(isUnsynced(records.b)).toBeFalsy();
    });

    test('does not mark stale records as synced', () => {
      records.a = {
        revisionId: 2,
        lastSyncedRevisionId: 0,
      };
      results.data.a = {revisionId: 1, data: 'new data'};
      applySyncActionResults(data, records, results, at);
      expect(isUnsynced(records.a)).toBeTruthy();
    });

    test('records new data', () => {
      results.data.a = {data: 'new data'};
      applySyncActionResults(data, records, results, at);
      expect(data.a).toEqual('new data');
    });

    test('does not record stale data', () => {
      data.a = 'existing data';
      results.data.a = {revisionId: 1, data: 'new data'};
      records.a = {revisionId: 2};
      applySyncActionResults(data, records, results, at);
      expect(data.a).toEqual('existing data');
    });

    test('clears old errors on success', () => {
      results.data.a = {data: 'new data'};
      records.a = {lastSyncedError: 'existing error'};
      applySyncActionResults(data, records, results, at);
      expect(records.a.lastSyncedError).toBeUndefined();
    });

    test('records new errors', () => {
      results.errors.a = {data: 'new error'};
      applySyncActionResults(data, records, results, at);
      expect(records.a.lastSyncedError).toEqual('new error');
    });

    test('does not record stale errors', () => {
      results.errors.a = {revisionId: 1, data: 'new error'};
      records.a = {revisionId: 2, lastSyncedError: 'existing error'};
      applySyncActionResults(data, records, results, at);
      expect(records.a.lastSyncedError).toEqual('existing error');
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

    test('handles results with no sync records', () => {
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

  describe('reinitializeSyncRecordsAndData', () => {
    let records: SyncRecords<any, any>;
    let data: Record<string, any>;
    let initialData: Record<string, any>;

    beforeEach(() => {
      records = {};
      data = {};
      initialData = {};
    });

    test('populates with initial data', () => {
      initialData.a = 'data';
      initialData.b = 'more data';
      const {newRecords, newData} = mergeUnsyncedRecordsWithData(
        records,
        data,
        initialData,
      );

      expect(newData).toEqual(initialData);
      expect(newRecords).toEqual({
        a: {
          lastSyncedData: 'data',
        },
        b: {
          lastSyncedData: 'more data',
        },
      });
    });

    test('overwrites existing synced data', () => {
      data.a = 'old data';
      records.a = {lastSyncedRevisionId: 100, revisionId: 100};
      initialData.a = 'new data';
      const {newRecords, newData} = mergeUnsyncedRecordsWithData(
        records,
        data,
        initialData,
      );

      expect(newData.a).toEqual('new data');
      expect(newRecords.a).toEqual({lastSyncedData: 'new data'});
    });

    test('removes deleted synced data', () => {
      data.a = 'old data';
      records.a = {lastSyncedRevisionId: 100, revisionId: 100};
      const {newRecords, newData} = mergeUnsyncedRecordsWithData(
        records,
        data,
        initialData,
      );

      expect(newData).toEqual({});
      expect(newRecords).toEqual({});
    });

    test('preserves existing unsynced data', () => {
      data.a = 'old data';
      records.a = {lastSyncedRevisionId: 99, revisionId: 100};
      initialData.a = 'new data';
      const {newRecords, newData} = mergeUnsyncedRecordsWithData(
        records,
        data,
        initialData,
      );

      expect(newData.a).toEqual('old data');
      expect(newRecords.a).toEqual({
        lastSyncedRevisionId: 99,
        revisionId: 100,
      });
    });
  });

  describe('initializeSyncRecords', () => {
    test('populates with initial data', () => {
      const data = {
        a: 'data',
        b: 'more data',
      };
      const records = initializeSyncRecords(data);

      expect(records).toEqual({
        a: {
          lastSyncedData: 'data',
        },
        b: {
          lastSyncedData: 'more data',
        },
      });
    });
  });
});
