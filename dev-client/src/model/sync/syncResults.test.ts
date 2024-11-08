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
  isUnsynced,
  SyncRecords,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/syncRecords';
import {
  applySyncedDatum,
  applySyncedError,
  applySyncedValuesToData,
  applySyncResults,
  getValues,
  getValuesForCurrentRevisions,
  isValueForCurrentRevision,
  SyncResults,
} from 'terraso-mobile-client/model/sync/syncResults';

describe('sync results', () => {
  describe('applySyncResults', () => {
    let data: Record<string, any>;
    let records: SyncRecords<any, any>;
    let results: SyncResults<any, any>;
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
      results.data.a = {revisionId: 1, value: 'new data'};
      results.errors.b = {revisionId: 1, value: 'new error'};
      applySyncResults(data, records, results, at);
      expect(isUnsynced(records.a)).toBeFalsy();
      expect(isUnsynced(records.b)).toBeFalsy();
    });

    test('does not mark stale records as synced', () => {
      records.a = {
        revisionId: 2,
        lastSyncedRevisionId: 0,
      };
      results.data.a = {revisionId: 1, value: 'new data'};
      applySyncResults(data, records, results, at);
      expect(isUnsynced(records.a)).toBeTruthy();
    });

    test('records new data', () => {
      results.data.a = {value: 'new data'};
      applySyncResults(data, records, results, at);
      expect(data.a).toEqual('new data');
    });

    test('does not record stale data', () => {
      data.a = 'existing data';
      results.data.a = {revisionId: 1, value: 'new data'};
      records.a = {revisionId: 2};
      applySyncResults(data, records, results, at);
      expect(data.a).toEqual('existing data');
    });

    test('clears old errors on success', () => {
      results.data.a = {value: 'new data'};
      records.a = {lastSyncedError: 'existing error'};
      applySyncResults(data, records, results, at);
      expect(records.a.lastSyncedError).toBeUndefined();
    });

    test('records new errors', () => {
      results.errors.a = {value: 'new error'};
      applySyncResults(data, records, results, at);
      expect(records.a.lastSyncedError).toEqual('new error');
    });

    test('does not record stale errors', () => {
      results.errors.a = {revisionId: 1, value: 'new error'};
      records.a = {revisionId: 2, lastSyncedError: 'existing error'};
      applySyncResults(data, records, results, at);
      expect(records.a.lastSyncedError).toEqual('existing error');
    });
  });

  describe('getValuesForCurrentRevisions', () => {
    test('returns results with matching revision IDs', () => {
      expect(
        getValuesForCurrentRevisions(
          {a: {revisionId: 1}, b: {revisionId: 1}, c: {revisionId: 2}},
          {
            a: {revisionId: 2, value: 'data'},
            b: {revisionId: 1, value: 'data'},
            c: {revisionId: 1, value: 'data'},
          },
        ),
      ).toEqual({b: {revisionId: 1, value: 'data'}});
    });

    test('handles results with no sync records', () => {
      expect(
        getValuesForCurrentRevisions(
          {},
          {
            a: {revisionId: undefined, value: 'data'},
            b: {revisionId: 1, value: 'data'},
          },
        ),
      ).toEqual({a: {revisionId: undefined, value: 'data'}});
    });
  });

  describe('isValueForCurrentRevision', () => {
    test('returns true with matching revision IDs', () => {
      expect(
        isValueForCurrentRevision(
          {revisionId: 1},
          {revisionId: 1, value: 'data'},
        ),
      ).toBeTruthy();
    });

    test('handles false with no matching revision IDs', () => {
      expect(
        isValueForCurrentRevision(
          {revisionId: 1},
          {revisionId: 2, value: 'data'},
        ),
      ).toBeFalsy();
    });
  });

  describe('applySyncedDatum', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      applySyncedDatum(records, 'a', {value: 'data'}, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced revision id', () => {
      applySyncedDatum(
        records,
        'a',
        {revisionId: 123, value: 'data'},
        Date.now(),
      );
      expect(records.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records synced data', () => {
      applySyncedDatum(records, 'a', {value: 'data'}, Date.now());
      expect(records.a.lastSyncedData).toEqual('data');
    });

    test('records synced date', () => {
      const at = Date.now();
      applySyncedDatum(records, 'a', {value: 'data'}, at);
      expect(records.a.lastSyncedAt).toEqual(at);
    });

    test('clears sync error', () => {
      records.a = {
        lastSyncedError: 'error',
      };
      const at = Date.now();
      applySyncedDatum(records, 'a', {value: 'data'}, at);
      expect(records.a.lastSyncedError).toBeUndefined();
    });

    test('preserves other properties', () => {
      records.a = {
        revisionId: 100,
        lastModifiedAt: 10000,
      };
      applySyncedDatum(records, 'a', {value: 'data'}, Date.now());
      expect(records.a.revisionId).toEqual(100);
      expect(records.a.lastModifiedAt).toEqual(10000);
    });
  });

  describe('applySyncedError', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      applySyncedError(records, 'a', {value: 'error'}, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced revision id', () => {
      applySyncedError(
        records,
        'a',
        {revisionId: 123, value: 'data'},
        Date.now(),
      );
      expect(records.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records error', () => {
      applySyncedError(records, 'a', {value: 'error'}, Date.now());
      expect(records.a.lastSyncedError).toEqual('error');
    });

    test('records synced date', () => {
      const at = Date.now();
      applySyncedError(records, 'a', {value: 'data'}, at);
      expect(records.a.lastSyncedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      records.a = {
        revisionId: 101,
        lastSyncedData: 'data',
      };
      applySyncedError(records, 'a', {value: 'error'}, Date.now());
      expect(records.a.revisionId).toEqual(101);
      expect(records.a.lastSyncedData).toEqual('data');
    });
  });

  describe('applySyncedValuesToData', () => {
    test('assigns data from sync results', () => {
      const data = {a: 'old data', b: 'other data'};
      applySyncedValuesToData(data, {
        a: {
          value: 'data',
        },
      });
      expect(data).toEqual({a: 'data', b: 'other data'});
    });
  });

  describe('getValues', () => {
    test('returns data from sync results', () => {
      expect(
        getValues({
          a: {
            value: 'data',
          },
        }),
      ).toEqual({a: 'data'});
    });
  });
});
