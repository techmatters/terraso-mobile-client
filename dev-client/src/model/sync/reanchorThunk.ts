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

import {isEqual} from 'lodash';

import type {Site} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';
import * as syncService from 'terraso-client-shared/soilId/syncService';
import {createAsyncThunk} from 'terraso-client-shared/store/utils';

import {
  getChangedSiteFields,
  getDeletedNotes,
  getNewNotes,
  getUpdatedNotes,
} from 'terraso-mobile-client/model/site/actions/siteDiff';
import {
  getChangedDepthDependentData,
  getChangedDepthIntervals,
  getChangedSoilDataFields,
  getDeletedDepthIntervals,
} from 'terraso-mobile-client/model/soilData/actions/soilDataDiff';
import {
  getEntityRecord,
  isUnsynced,
  modifiedRecord,
  SyncRecord,
  SyncRecords,
  SyncTimestamp,
} from 'terraso-mobile-client/model/sync/records';

/**
 * One-time "re-anchor to prod" — see docs/v396staging-prod-recovery-plan.md.
 *
 * A build was released against staging by mistake; users who moved their offline
 * edits to that build and then update to the prod build would otherwise have
 * work stranded: the client only pushes records it considers unsynced, so edits
 * it believes were already synced (to staging) are never sent to prod.
 *
 * This reuses the fetch-only `pullUserData` service, but under its own action
 * type so its fulfilled handler is separate from the normal pull (which MERGES
 * server data into state). The re-anchor handler does NOT merge data — it only
 * rewrites sync records so that local edits prod is missing or has stale get
 * pushed by the normal push machinery. It runs once per install (guarded by a
 * persisted flag in ReanchorDispatcher) and only touches records the client
 * currently believes are synced, so in-flight edits and never-synced creates
 * are left untouched.
 */
export const reanchorUserData = createAsyncThunk(
  'sync/reanchorUserData',
  syncService.pullUserData,
);

/**
 * Re-anchor one entity type's sync records against prod.
 *
 * For each local entity the client currently believes is synced
 * (`!isUnsynced`):
 *  - prod absent  → mark unsynced + isNew (`lastSyncedData` undefined) → CREATE.
 *  - prod differs → mark unsynced, anchor `lastSyncedData` to prod → UPDATE, so
 *                   the push delta is exactly local − prod.
 *  - prod equal   → leave untouched.
 *
 * `modifiedRecord` bumps `revisionId` above `lastSyncedRevisionId`, which is
 * what makes the record unsynced (`isUnsynced` compares the two). Records that
 * are already unsynced are skipped — the normal push handles them.
 */
export const reanchorEntity = <D, E>(
  records: SyncRecords<D, E>,
  localData: Record<string, D | undefined>,
  prodData: Record<string, D | undefined | null>,
  differs: (local: D, prod: D) => boolean,
  now: SyncTimestamp,
): void => {
  for (const id of Object.keys(localData)) {
    const local = localData[id];
    if (local === undefined) {
      continue;
    }
    const record = getEntityRecord(records, id);
    if (isUnsynced(record)) {
      // Leave in-flight / never-synced edits to the normal push.
      continue;
    }
    const prod = prodData[id];
    if (prod === undefined || prod === null) {
      // Prod doesn't have it → recreate on prod.
      const recreated: SyncRecord<D, E> = {
        ...record,
        lastSyncedData: undefined,
        lastSyncedRevisionId: undefined,
        lastSyncedError: undefined,
      };
      records[id] = modifiedRecord(recreated, now);
    } else if (differs(local, prod)) {
      // Prod has a stale copy → push local over it (delta computed vs prod).
      const anchored: SyncRecord<D, E> = {
        ...record,
        lastSyncedData: prod,
        lastSyncedRevisionId: record.revisionId,
        lastSyncedError: undefined,
      };
      records[id] = modifiedRecord(anchored, now);
    }
    // else prod equals local → untouched.
  }
};

/**
 * "Differs" predicates reuse the exact diff functions the push uses, so the
 * re-anchor only dirties a record when the push would actually send something.
 */
export const siteDiffers = (local: Site, prod: Site): boolean =>
  Object.keys(getChangedSiteFields(local, prod)).length > 0 ||
  getNewNotes(local.notes, prod.notes).length > 0 ||
  getUpdatedNotes(local.notes, prod.notes).length > 0 ||
  getDeletedNotes(local.notes, prod.notes).length > 0;

export const soilDataDiffers = (local: SoilData, prod: SoilData): boolean =>
  Object.keys(getChangedSoilDataFields(local, prod)).length > 0 ||
  getChangedDepthIntervals(local, prod).length > 0 ||
  getChangedDepthDependentData(local, prod).length > 0 ||
  getDeletedDepthIntervals(local, prod).length > 0;

const normalizeRatings = (metadata: SoilMetadata) =>
  (metadata.userRatings ?? [])
    .filter(rating => rating.rating !== null && rating.rating !== undefined)
    .map(rating => ({soilMatchId: rating.soilMatchId, rating: rating.rating}))
    .sort((a, b) => a.soilMatchId.localeCompare(b.soilMatchId));

// soilMetadata has no field-diff helper (its push sends the whole userRatings
// set); compare the same normalized ratings the push would send.
export const soilMetadataDiffers = (
  local: SoilMetadata,
  prod: SoilMetadata,
): boolean => !isEqual(normalizeRatings(local), normalizeRatings(prod));
