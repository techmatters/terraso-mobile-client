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

import type {Site} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  reanchorEntity,
  siteDiffers,
  soilDataDiffers,
  soilMetadataDiffers,
} from 'terraso-mobile-client/model/sync/reanchorThunk';
import {
  initialRecord,
  isUnsynced,
  modifiedRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';

type D = {v: number};
const differs = (a: D, b: D) => a.v !== b.v;
const NOW = 1000;

describe('reanchorEntity', () => {
  test('prod absent → record becomes unsynced and isNew (lastSyncedData undefined)', () => {
    const records: SyncRecords<D, unknown> = {a: initialRecord({v: 1})};
    reanchorEntity(records, {a: {v: 1}}, {}, differs, NOW);

    expect(isUnsynced(records.a)).toBe(true);
    expect(records.a.lastSyncedData).toBeUndefined();
  });

  test('prod present & differs → unsynced, lastSyncedData anchored to prod', () => {
    // Clean record whose last-synced value is the (staging) local value; prod
    // holds a stale copy.
    const records: SyncRecords<D, unknown> = {a: initialRecord({v: 2})};
    reanchorEntity(records, {a: {v: 2}}, {a: {v: 1}}, differs, NOW);

    expect(isUnsynced(records.a)).toBe(true);
    // Anchored to prod → the push delta will be local(2) − prod(1).
    expect(records.a.lastSyncedData).toEqual({v: 1});
  });

  test('prod present & equal → untouched (still synced)', () => {
    const original = initialRecord<D, unknown>({v: 1});
    const records: SyncRecords<D, unknown> = {a: original};
    reanchorEntity(records, {a: {v: 1}}, {a: {v: 1}}, differs, NOW);

    expect(isUnsynced(records.a)).toBe(false);
    expect(records.a).toBe(original);
  });

  test('already-unsynced record → untouched', () => {
    const original = modifiedRecord(initialRecord<D, unknown>({v: 1}), 100);
    const records: SyncRecords<D, unknown> = {a: original};
    reanchorEntity(records, {a: {v: 2}}, {a: {v: 9}}, differs, NOW);

    expect(records.a).toBe(original);
  });

  test('null prod value is treated as absent → CREATE', () => {
    const records: SyncRecords<D, unknown> = {a: initialRecord({v: 1})};
    reanchorEntity(records, {a: {v: 1}}, {a: null}, differs, NOW);

    expect(isUnsynced(records.a)).toBe(true);
    expect(records.a.lastSyncedData).toBeUndefined();
  });

  test('undefined local value is skipped', () => {
    const original = initialRecord<D, unknown>({v: 1});
    const records: SyncRecords<D, unknown> = {a: original};
    reanchorEntity(records, {a: undefined}, {}, differs, NOW);

    expect(records.a).toBe(original);
  });

  test('returns the records it marked (create/update); skips are not returned', () => {
    const records: SyncRecords<D, unknown> = {
      create: initialRecord({v: 1}), // prod absent → create
      update: initialRecord({v: 2}), // prod differs → update
      equal: initialRecord({v: 1}), // prod equal → skip
      dirty: modifiedRecord(initialRecord<D, unknown>({v: 2}), NOW), // unsynced → skip
    };
    const marks = reanchorEntity(
      records,
      {create: {v: 1}, update: {v: 2}, equal: {v: 1}, dirty: {v: 2}},
      {update: {v: 1}, equal: {v: 1}, dirty: {v: 9}}, // create absent; update stale
      differs,
      NOW,
    );

    expect(marks).toHaveLength(2);
    expect(marks).toEqual(
      expect.arrayContaining([
        {id: 'create', action: 'create'},
        {id: 'update', action: 'update'},
      ]),
    );
  });
});

describe('siteDiffers', () => {
  const baseSite = {
    id: 's1',
    name: 'Site',
    latitude: 1,
    longitude: 2,
    elevation: 10,
    privacy: 'PRIVATE',
    archived: false,
    updatedAt: '2026-01-01',
    notes: {},
  } as unknown as Site;

  test('identical sites do not differ', () => {
    expect(siteDiffers(baseSite, baseSite)).toBe(false);
  });

  test('changed update field differs', () => {
    expect(siteDiffers({...baseSite, name: 'Changed'}, baseSite)).toBe(true);
  });

  test('new note differs', () => {
    const withNote = {
      ...baseSite,
      notes: {n1: {id: 'n1', content: 'hi'}},
    } as unknown as Site;
    expect(siteDiffers(withNote, baseSite)).toBe(true);
  });
});

describe('soilDataDiffers', () => {
  const soil = (overrides: object): SoilData =>
    ({
      depthIntervals: [],
      depthDependentData: [],
      ...overrides,
    }) as unknown as SoilData;

  test('identical soil data does not differ', () => {
    expect(
      soilDataDiffers(soil({bedrock: false}), soil({bedrock: false})),
    ).toBe(false);
  });

  test('changed top-level field differs', () => {
    expect(soilDataDiffers(soil({bedrock: true}), soil({bedrock: false}))).toBe(
      true,
    );
  });
});

describe('soilMetadataDiffers', () => {
  const meta = (ratings: object[]): SoilMetadata =>
    ({userRatings: ratings}) as unknown as SoilMetadata;

  test('identical ratings do not differ', () => {
    expect(
      soilMetadataDiffers(
        meta([{soilMatchId: 'm1', rating: 'SELECTED'}]),
        meta([{soilMatchId: 'm1', rating: 'SELECTED'}]),
      ),
    ).toBe(false);
  });

  test('different ratings differ', () => {
    expect(
      soilMetadataDiffers(
        meta([{soilMatchId: 'm1', rating: 'SELECTED'}]),
        meta([]),
      ),
    ).toBe(true);
  });

  test('null ratings are ignored (normalize to empty)', () => {
    expect(
      soilMetadataDiffers(meta([{soilMatchId: 'm1', rating: null}]), meta([])),
    ).toBe(false);
  });
});
