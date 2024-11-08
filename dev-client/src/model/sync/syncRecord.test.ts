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
  initialRecord,
  isError,
  isUnsynced,
  modifiedRecord,
  syncedRecord,
} from 'terraso-mobile-client/model/sync/syncRecord';

describe('sync', () => {
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
});
