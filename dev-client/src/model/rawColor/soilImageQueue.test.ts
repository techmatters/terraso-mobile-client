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
  createSoilImageQueue,
  NewSoilImageQueueEntry,
  SoilImageQueue,
  SoilImageQueueEntry,
} from 'terraso-mobile-client/model/rawColor/soilImageQueue';

// In-memory harness — same style as rawCaptureStore.test.ts. Everything
// (index, clock, deleted-file log, id generator) is captured so tests can
// assert on them.
const makeQueue = (): {
  queue: SoilImageQueue;
  deleted: string[];
  index: () => SoilImageQueueEntry[];
} => {
  let index: SoilImageQueueEntry[] = [];
  let clock = 1000;
  let idCounter = 0;
  const deleted: string[] = [];
  const queue = createSoilImageQueue({
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
    newId: () => `id-${++idCounter}`,
  });
  return {queue, deleted, index: () => index};
};

const entry = (
  siteId: string,
  start: number,
  end: number,
  uris: string[],
): NewSoilImageQueueEntry => ({
  siteId,
  siteName: `Site ${siteId}`,
  depth: {start, end},
  files: uris.map(uri => ({
    kind: uri.endsWith('.dng') ? 'raw' : 'jpeg',
    uri,
    contentType: uri.endsWith('.dng') ? 'image/x-adobe-dng' : 'image/jpeg',
  })),
});

describe('soilImageQueue', () => {
  test('enqueue stamps id/createdAt/status and persists', async () => {
    const {queue, index} = makeQueue();
    const e = await queue.enqueue(entry('s1', 0, 10, ['/tmp/a.dng']));
    expect(e.id).toBe('id-1');
    expect(e.createdAt).toBe(1001);
    expect(e.status).toBe('queued');
    expect(index()).toHaveLength(1);
    expect(index()[0]).toEqual(e);
  });

  test('enqueue dedups on (siteId, depth) — keeps latest, deletes prior files', async () => {
    const {queue, deleted, index} = makeQueue();
    await queue.enqueue(entry('s1', 0, 10, ['/tmp/a1.dng', '/tmp/a1.jpg']));
    await queue.enqueue(entry('s1', 0, 10, ['/tmp/a2.dng', '/tmp/a2.jpg']));
    expect(index()).toHaveLength(1);
    expect(index()[0].files.map(f => f.uri)).toEqual([
      '/tmp/a2.dng',
      '/tmp/a2.jpg',
    ]);
    expect(deleted).toEqual(['/tmp/a1.dng', '/tmp/a1.jpg']);
  });

  test('enqueue does NOT dedup across different depths or sites', async () => {
    const {queue, index} = makeQueue();
    await queue.enqueue(entry('s1', 0, 10, ['/a.jpg']));
    await queue.enqueue(entry('s1', 10, 20, ['/b.jpg']));
    await queue.enqueue(entry('s2', 0, 10, ['/c.jpg']));
    expect(index()).toHaveLength(3);
  });

  test('remove deletes the entry and its files', async () => {
    const {queue, deleted, index} = makeQueue();
    const e = await queue.enqueue(entry('s1', 0, 10, ['/x.dng', '/x.jpg']));
    await queue.remove(e.id);
    expect(index()).toHaveLength(0);
    expect(deleted).toEqual(['/x.dng', '/x.jpg']);
  });

  test('remove is a no-op for unknown id', async () => {
    const {queue, deleted, index} = makeQueue();
    await queue.enqueue(entry('s1', 0, 10, ['/x.jpg']));
    await queue.remove('nonexistent');
    expect(index()).toHaveLength(1);
    expect(deleted).toEqual([]);
  });

  test('clear empties the queue and deletes every file', async () => {
    const {queue, deleted, index} = makeQueue();
    await queue.enqueue(entry('s1', 0, 10, ['/a.jpg']));
    await queue.enqueue(entry('s2', 0, 10, ['/b.dng', '/b.jpg']));
    await queue.clear();
    expect(index()).toHaveLength(0);
    expect(deleted.sort()).toEqual(['/a.jpg', '/b.dng', '/b.jpg']);
  });

  test('markUploading / markFailed / markQueued flip status', async () => {
    const {queue, index} = makeQueue();
    const e = await queue.enqueue(entry('s1', 0, 10, ['/x.jpg']));
    queue.markUploading(e.id);
    expect(index()[0].status).toBe('uploading');
    queue.markFailed(e.id, 'S3 403');
    expect(index()[0].status).toBe('failed');
    expect(index()[0].failureReason).toBe('S3 403');
    queue.markQueued(e.id);
    expect(index()[0].status).toBe('queued');
    expect(index()[0].failureReason).toBeUndefined();
  });

  test('nextQueued returns the oldest queued entry, skipping uploading/failed', async () => {
    const {queue} = makeQueue();
    const e1 = await queue.enqueue(entry('s1', 0, 10, ['/a.jpg']));
    const e2 = await queue.enqueue(entry('s2', 0, 10, ['/b.jpg']));
    await queue.enqueue(entry('s3', 0, 10, ['/c.jpg']));
    queue.markUploading(e1.id);
    expect(queue.nextQueued()?.id).toBe(e2.id);
    queue.markFailed(e2.id, 'oops');
    expect(queue.nextQueued()?.id).toBe('id-3');
  });

  test('nextQueued is null when no queued entries', async () => {
    const {queue} = makeQueue();
    expect(queue.nextQueued()).toBeNull();
    const e = await queue.enqueue(entry('s1', 0, 10, ['/a.jpg']));
    queue.markUploading(e.id);
    expect(queue.nextQueued()).toBeNull();
  });

  test('subscribe fires on every mutation', async () => {
    const {queue} = makeQueue();
    const fn = jest.fn();
    queue.subscribe(fn);
    const e = await queue.enqueue(entry('s1', 0, 10, ['/a.jpg']));
    queue.markUploading(e.id);
    await queue.remove(e.id);
    await queue.clear();
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
