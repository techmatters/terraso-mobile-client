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
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/syncRecords';
import {
  applyActionResults,
  applyErrorResult,
  applyResult,
  applyResultsData,
  getResultsForCurrentRevisions,
  getSyncResultsData,
  SyncActionResults,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/syncResults';

describe('sync', () => {
  describe('applyResult', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      applyResult(records, 'a', {data: 'data'}, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced revision id', () => {
      applyResult(records, 'a', {revisionId: 123, data: 'data'}, Date.now());
      expect(records.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records synced data', () => {
      applyResult(records, 'a', {data: 'data'}, Date.now());
      expect(records.a.lastSyncedData).toEqual('data');
    });

    test('records synced date', () => {
      const at = Date.now();
      applyResult(records, 'a', {data: 'data'}, at);
      expect(records.a.lastSyncedAt).toEqual(at);
    });

    test('clears sync error', () => {
      records.a = {
        lastSyncedError: 'error',
      };
      const at = Date.now();
      applyResult(records, 'a', {data: 'data'}, at);
      expect(records.a.lastSyncedError).toBeUndefined();
    });

    test('preserves other properties', () => {
      records.a = {
        revisionId: 100,
        lastModifiedAt: 10000,
      };
      applyResult(records, 'a', {data: 'data'}, Date.now());
      expect(records.a.revisionId).toEqual(100);
      expect(records.a.lastModifiedAt).toEqual(10000);
    });
  });

  describe('applyErrorResult', () => {
    let records: SyncRecords<any, any>;

    beforeEach(() => {
      records = {};
    });

    test('initializes sync record if not present', () => {
      applyErrorResult(records, 'a', {data: 'error'}, Date.now());
      expect(records.a).toBeDefined();
    });

    test('records synced revision id', () => {
      applyErrorResult(
        records,
        'a',
        {revisionId: 123, data: 'data'},
        Date.now(),
      );
      expect(records.a.lastSyncedRevisionId).toEqual(123);
    });

    test('records error', () => {
      applyErrorResult(records, 'a', {data: 'error'}, Date.now());
      expect(records.a.lastSyncedError).toEqual('error');
    });

    test('records synced date', () => {
      const at = Date.now();
      applyErrorResult(records, 'a', {data: 'data'}, at);
      expect(records.a.lastSyncedAt).toEqual(at);
    });

    test('preserves other properties', () => {
      records.a = {
        revisionId: 101,
        lastSyncedData: 'data',
      };
      applyErrorResult(records, 'a', {data: 'error'}, Date.now());
      expect(records.a.revisionId).toEqual(101);
      expect(records.a.lastSyncedData).toEqual('data');
    });
  });

  describe('applyActionResults', () => {
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
      applyActionResults(data, records, results, at);
      expect(isUnsynced(records.a)).toBeFalsy();
      expect(isUnsynced(records.b)).toBeFalsy();
    });

    test('does not mark stale records as synced', () => {
      records.a = {
        revisionId: 2,
        lastSyncedRevisionId: 0,
      };
      results.data.a = {revisionId: 1, data: 'new data'};
      applyActionResults(data, records, results, at);
      expect(isUnsynced(records.a)).toBeTruthy();
    });

    test('records new data', () => {
      results.data.a = {data: 'new data'};
      applyActionResults(data, records, results, at);
      expect(data.a).toEqual('new data');
    });

    test('does not record stale data', () => {
      data.a = 'existing data';
      results.data.a = {revisionId: 1, data: 'new data'};
      records.a = {revisionId: 2};
      applyActionResults(data, records, results, at);
      expect(data.a).toEqual('existing data');
    });

    test('clears old errors on success', () => {
      results.data.a = {data: 'new data'};
      records.a = {lastSyncedError: 'existing error'};
      applyActionResults(data, records, results, at);
      expect(records.a.lastSyncedError).toBeUndefined();
    });

    test('records new errors', () => {
      results.errors.a = {data: 'new error'};
      applyActionResults(data, records, results, at);
      expect(records.a.lastSyncedError).toEqual('new error');
    });

    test('does not record stale errors', () => {
      results.errors.a = {revisionId: 1, data: 'new error'};
      records.a = {revisionId: 2, lastSyncedError: 'existing error'};
      applyActionResults(data, records, results, at);
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

  describe('applyResultsData', () => {
    test('assigns data from sync results', () => {
      const data = {a: 'old data', b: 'other data'};
      applyResultsData(data, {
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
});
