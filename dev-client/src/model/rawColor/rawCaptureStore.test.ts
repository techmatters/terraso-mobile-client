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

import {
  createRawCaptureStore,
  keepLastN,
  RawCaptureStore,
  StoredCapture,
} from 'terraso-mobile-client/model/rawColor/rawCaptureStore';

// In-memory harness: an index array, a fake clock, and a record of deleted
// file URIs so we can assert eviction actually cleans files up.
const makeStore = (
  keepN: number,
): {
  store: RawCaptureStore;
  deleted: string[];
  index: () => StoredCapture[];
} => {
  let index: StoredCapture[] = [];
  let clock = 1000;
  const deleted: string[] = [];
  const store = createRawCaptureStore({
    fs: {
      deleteFile: async uri => {
        deleted.push(uri);
      },
    },
    readIndex: () => index,
    writeIndex: next => {
      index = next;
    },
    now: () => (clock += 1),
    policy: keepLastN(keepN),
  });
  return {store, deleted, index: () => index};
};

const cap = (id: string) => ({
  id,
  dngUri: `file://${id}.dng`,
  jpegUri: `file://${id}.jpg`,
});

describe('keepLastN', () => {
  test('evicts everything past the N newest', () => {
    const caps: StoredCapture[] = ['c', 'b', 'a'].map((id, i) => ({
      id,
      createdAt: 100 - i,
    }));
    expect(keepLastN(2).selectForEviction(caps)).toEqual(['a']);
    expect(keepLastN(5).selectForEviction(caps)).toEqual([]);
    expect(keepLastN(0).selectForEviction(caps)).toEqual(['c', 'b', 'a']);
  });
});

describe('rawCaptureStore', () => {
  test('add stamps createdAt and lists newest-first', async () => {
    const {store} = makeStore(10);
    await store.add(cap('one'));
    await store.add(cap('two'));
    const list = store.list();
    expect(list.map(c => c.id)).toEqual(['two', 'one']);
    expect(list[0].createdAt).toBeGreaterThan(list[1].createdAt);
  });

  test('get returns a capture by id', async () => {
    const {store} = makeStore(10);
    await store.add(cap('one'));
    expect(store.get('one')?.dngUri).toBe('file://one.dng');
    expect(store.get('missing')).toBeUndefined();
  });

  test('re-adding the same id replaces rather than duplicates', async () => {
    const {store} = makeStore(10);
    await store.add({id: 'x', dngUri: 'file://x-v1.dng'});
    await store.add({id: 'x', dngUri: 'file://x-v2.dng'});
    expect(store.list()).toHaveLength(1);
    expect(store.get('x')?.dngUri).toBe('file://x-v2.dng');
  });

  test('eviction keeps the N newest and deletes the evicted files', async () => {
    const {store, deleted} = makeStore(2);
    await store.add(cap('a'));
    await store.add(cap('b'));
    await store.add(cap('c')); // evicts 'a'

    expect(store.list().map(c => c.id)).toEqual(['c', 'b']);
    // Both files of the evicted capture are cleaned up.
    expect(deleted).toEqual(['file://a.dng', 'file://a.jpg']);
  });

  test('clearAll empties the index and deletes all files', async () => {
    const {store, deleted} = makeStore(10);
    await store.add(cap('a'));
    await store.add(cap('b'));
    await store.clearAll();
    expect(store.list()).toEqual([]);
    expect(deleted.sort()).toEqual(
      ['file://a.dng', 'file://a.jpg', 'file://b.dng', 'file://b.jpg'].sort(),
    );
  });
});
