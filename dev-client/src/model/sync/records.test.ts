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
  errorRecord,
  getDataForRecords,
  getEntityRecords,
  getErrorRecords,
  getUnsyncedRecords,
  initializeEntityRecords,
  initialRecord,
  isError,
  isUnsynced,
  markEntityError,
  markEntityModified,
  markEntitySynced,
  mergeUnsyncedEntities,
  modifiedRecord,
  syncedRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';

describe('record', () => {
  describe('initialRecord', () => {
    test('populates with initial data', () => {
      const result = initialRecord('data');
      expect(result).toEqual({lastSyncedData: 'data'});
    });
  });

  describe('modifiedRecord', () => {
    test('initializes revision id if not present', () => {
      const result = modifiedRecord({}, Date.now());
      expect(result.revisionId).toEqual(1);
    });

    test('increments revision id', () => {
      const result = modifiedRecord({revisionId: 122}, Date.now());
      expect(result.revisionId).toEqual(123);
    });

    test('record modified date', () => {
      const at = Date.now();
      const result = modifiedRecord({}, at);
      expect(result.lastModifiedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      const record = {
        lastSyncedRevisionId: 100,
        lastSyncedData: 'data',
        lastSyncedError: 'error',
        lastSyncedAt: 10000,
      };
      const result = modifiedRecord(record, Date.now());
      expect(result.lastSyncedRevisionId).toEqual(100);
      expect(result.lastSyncedData).toEqual('data');
      expect(result.lastSyncedError).toEqual('error');
      expect(result.lastSyncedAt).toEqual(10000);
    });
  });

  describe('syncedRecord', () => {
    test('record synced revision id', () => {
      const result = syncedRecord({}, 'data', 123, Date.now());
      expect(result.lastSyncedRevisionId).toEqual(123);
    });

    test('record synced data', () => {
      const result = syncedRecord({}, 'data', 123, Date.now());
      expect(result.lastSyncedData).toEqual('data');
    });

    test('record synced date', () => {
      const at = Date.now();
      const result = syncedRecord({}, 'data', 123, at);
      expect(result.lastSyncedAt).toEqual(at);
    });

    test('clears sync error', () => {
      const record = {
        lastSyncedError: 'error',
      };
      const result = syncedRecord(record, 'data', 123, Date.now());
      expect(result.lastSyncedError).toBeUndefined();
    });

    test('preserves other properties', () => {
      const record = {
        revisionId: 100,
        lastModifiedAt: 10000,
      };
      const result = syncedRecord(record, 'data', 123, Date.now());
      expect(result.revisionId).toEqual(100);
      expect(result.lastModifiedAt).toEqual(10000);
    });
  });

  describe('errorRecord', () => {
    test('record synced revision id', () => {
      const result = errorRecord({}, 'error', 123, Date.now());
      expect(result.lastSyncedRevisionId).toEqual(123);
    });

    test('record error', () => {
      const result = errorRecord({}, 'error', 123, Date.now());
      expect(result.lastSyncedError).toEqual('error');
    });

    test('record synced date', () => {
      const at = Date.now();
      const result = errorRecord({}, 'error', 123, Date.now());
      expect(result.lastSyncedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      const record = {
        revisionId: 101,
        lastSyncedData: 'data',
      };
      const result = errorRecord(record, 'error', 123, Date.now());
      expect(result.revisionId).toEqual(101);
      expect(result.lastSyncedData).toEqual('data');
    });
  });

  describe('isUnsynced', () => {
    test('returns synced for empty record', () => {
      expect(isUnsynced({})).toBeFalsy();
    });

    test('returns synced for record with matching revision ids', () => {
      expect(
        isUnsynced({
          revisionId: 10,
          lastSyncedRevisionId: 10,
        }),
      ).toBeFalsy();
    });

    test('returns unsynced for record without matching revision ids', () => {
      expect(
        isUnsynced({
          revisionId: 10,
          lastSyncedRevisionId: 9,
        }),
      ).toBeTruthy();
    });

    test('returns unsynced for never-synced record', () => {
      expect(
        isUnsynced({
          revisionId: 10,
        }),
      ).toBeTruthy();
    });
  });

  describe('isError', () => {
    test('returns non error for empty record', () => {
      expect(isError({})).toBeFalsy();
    });

    test('returns error for record with an error value', () => {
      expect(isError({lastSyncedError: 'error'})).toBeTruthy();
    });

    test('returns non error for record without an error value', () => {
      expect(isError({lastSyncedError: undefined})).toBeFalsy();
    });
  });

  describe('initializeEntityRecords', () => {
    test('populates with initial data', () => {
      const data = {
        a: 'data',
        b: 'more data',
      };
      const records = initializeEntityRecords(data);

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

  describe('mergeUnsyncedEntities', () => {
    let records: SyncRecords<any, any>;
    let data: Record<string, any>;
    let newData: Record<string, any>;

    beforeEach(() => {
      records = {};
      data = {};
      newData = {};
    });

    test('adds new data', () => {
      newData.a = 'data';
      newData.b = 'more data';
      const {mergedRecords, mergedData} = mergeUnsyncedEntities(
        records,
        data,
        newData,
      );

      expect(mergedData).toEqual(newData);
      expect(mergedRecords).toEqual({
        a: {lastSyncedData: 'data'},
        b: {lastSyncedData: 'more data'},
      });
    });

    test('overwrites existing synced data', () => {
      data.a = 'old data';
      records.a = {lastSyncedRevisionId: 100, revisionId: 100};
      newData.a = 'new data';
      const {mergedRecords, mergedData} = mergeUnsyncedEntities(
        records,
        data,
        newData,
      );

      expect(mergedData.a).toEqual('new data');
      expect(mergedRecords.a).toEqual({lastSyncedData: 'new data'});
    });

    test('removes deleted synced data', () => {
      data.a = 'old data';
      records.a = {lastSyncedRevisionId: 100, revisionId: 100};
      const {mergedRecords, mergedData} = mergeUnsyncedEntities(
        records,
        data,
        newData,
      );

      expect(mergedData).toEqual({});
      expect(mergedRecords).toEqual({});
    });

    test('preserves existing unsynced data', () => {
      data.a = 'old data';
      records.a = {lastSyncedRevisionId: 99, revisionId: 100};
      newData.a = 'new data';
      const {mergedRecords, mergedData} = mergeUnsyncedEntities(
        records,
        data,
        newData,
      );

      expect(mergedData.a).toEqual('old data');
      expect(mergedRecords.a).toEqual({
        lastSyncedRevisionId: 99,
        revisionId: 100,
      });
    });
  });

  describe('getEntityRecords', () => {
    test('returns records for ids', () => {
      const records = {a: {revisionId: 1}, b: {revisionId: 2}};
      expect(getEntityRecords(records, ['a'])).toEqual({a: {revisionId: 1}});
    });

    test('returns empty records when missing', () => {
      const records = {};
      expect(getEntityRecords(records, ['a'])).toEqual({a: {}});
    });
  });

  describe('getDataForRecords', () => {
    test('returns data for records by id', () => {
      const records = {
        a: {},
      };
      const data = {
        a: 'data 1',
        b: 'data 2',
      };
      const result = getDataForRecords(records, data);
      expect(result).toEqual({a: 'data 1'});
    });

    test('excludes missing ids', () => {
      const records = {
        a: {},
      };
      const data = {};
      const result = getDataForRecords(records, data);
      expect(result).toEqual({});
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

  describe('markEntityModified', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      markEntityModified(records, 'a', Date.now());
      expect(records.a).toBeDefined();
    });

    test('initializes revision id if not present', () => {
      records.a = {};
      markEntityModified(records, 'a', Date.now());
      expect(records.a.revisionId).toEqual(1);
    });

    test('increments revision id', () => {
      records.a = {revisionId: 122};
      markEntityModified(records, 'a', Date.now());
      expect(records.a.revisionId).toEqual(123);
    });

    test('records modified date', () => {
      const at = Date.now();
      markEntityModified(records, 'a', at);
      expect(records.a.lastModifiedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      records.a = {
        lastSyncedRevisionId: 100,
        lastSyncedData: 'data',
        lastSyncedError: 'error',
        lastSyncedAt: 10000,
      };
      markEntityModified(records, 'a', Date.now());
      expect(records.a.lastSyncedRevisionId).toEqual(100);
      expect(records.a.lastSyncedData).toEqual('data');
      expect(records.a.lastSyncedError).toEqual('error');
      expect(records.a.lastSyncedAt).toEqual(10000);
    });
  });

  describe('markEntitySynced', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      markEntitySynced(records, 'a', 'data', 0, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced state', () => {
      const at = Date.now();
      markEntitySynced(records, 'a', 'data', 123, at);
      expect(records.a.lastSyncedData).toEqual('data');
      expect(records.a.lastSyncedRevisionId).toEqual(123);
      expect(records.a.lastSyncedAt).toEqual(at);
    });
  });

  describe('markError', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      markEntityError(records, 'a', 'error', 123, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records error state', () => {
      const at = Date.now();
      markEntityError(records, 'a', 'error', 123, Date.now());
      expect(records.a.lastSyncedError).toEqual('error');
      expect(records.a.lastSyncedRevisionId).toEqual(123);
      expect(records.a.lastSyncedAt).toEqual(at);
    });
  });
});
