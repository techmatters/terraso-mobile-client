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

/**
 * Debug logging for sync state changes.
 * All output is gated behind FF_testing.
 * Temporary — remove when offline sync is stable.
 */

import {syncDebugEnabled} from 'terraso-mobile-client/config';
import {
  isError,
  isUnsynced,
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';

const B = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const L = '────────────────────────────────────';

const sid = (id: string) => id.slice(0, 8);

const fmt = (val: unknown, max = 30): string => {
  if (val === undefined) {
    return '-';
  }
  if (val === null) {
    return 'null';
  }
  try {
    const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    return s.length > max ? s.slice(0, max) + '…' : s;
  } catch {
    return '[?]';
  }
};

const statusLabel = (rec: SyncRecord<unknown, unknown>): string => {
  if (isUnsynced(rec) && isError(rec)) {
    return 'UNSYNCED+ERR';
  }
  if (isUnsynced(rec)) {
    return 'UNSYNCED';
  }
  if (isError(rec)) {
    return 'ERROR';
  }
  return 'SYNCED';
};

const recInfo = (r: SyncRecord<unknown, unknown>): string => {
  const p = [
    `rev=${r.revisionId ?? '-'}`,
    `syncRev=${r.lastSyncedRevisionId ?? '-'}`,
  ];
  if (isUnsynced(r)) {
    p.push('UNSYNCED');
  } else {
    p.push('SYNCED');
  }
  if (isError(r)) {
    p.push('ERROR');
  }
  return p.join(' ');
};

/**
 * Log a single entity's sync state after a change (one line).
 * Call after markEntityModified or similar single-entity ops.
 */
export const logSyncChange = (
  action: string,
  type: string,
  siteId: string,
  record: SyncRecord<unknown, unknown>,
  data?: unknown,
) => {
  if (!syncDebugEnabled) {
    return;
  }
  const name =
    data && typeof data === 'object' && 'name' in data
      ? String((data as {name: string}).name)
      : sid(siteId);
  const rv = String(record.revisionId ?? '-');
  const sr = String(record.lastSyncedRevisionId ?? '-');
  const status = statusLabel(record);
  const err = record.lastSyncedError ? ' +ERR' : '';
  console.log(
    `🔍 ${action} [${type}] ${name} (${sid(siteId)}) ${rv}/${sr} ${status}${err}`,
  );
};

/**
 * Log summary of all sync records for an entity type.
 * Call after bulk ops (push result, pull merge).
 */
export const logSyncSummary = (
  action: string,
  type: string,
  records: SyncRecords<unknown, unknown>,
  data?: Record<string, unknown>,
) => {
  if (!syncDebugEnabled) {
    return;
  }

  const all = Object.entries(records);
  const unsynced = all.filter(([_, r]) => isUnsynced(r));
  const errors = all.filter(([_, r]) => isError(r));

  console.log(B);
  console.log(`🔍 ${action} [${type}]`);
  console.log(
    `   total=${all.length}`,
    `unsynced=${unsynced.length}`,
    `errors=${errors.length}`,
  );

  for (const [id, rec] of unsynced) {
    console.log(L);
    console.log(`   ${sid(id)}: ${recInfo(rec)}`);
    if (data?.[id]) {
      logDiff(data[id], rec.lastSyncedData);
    }
  }

  for (const [id, rec] of errors) {
    if (!isUnsynced(rec)) {
      console.log(L);
      console.log(`   ${sid(id)}: ${recInfo(rec)}`);
    }
    console.log(`   error: ${fmt(rec.lastSyncedError)}`);
  }
};

const logDiff = (curr: unknown, prev: unknown) => {
  if (!prev) {
    console.log('   (new, no lastSyncedData)');
    return;
  }
  if (!curr) {
    console.log('   (no current data)');
    return;
  }
  if (typeof curr !== 'object' || typeof prev !== 'object') {
    if (curr !== prev) {
      console.log(`   ${fmt(prev)} → ${fmt(curr)}`);
    }
    return;
  }

  const co = curr as Record<string, unknown>;
  const po = prev as Record<string, unknown>;
  const keys = new Set([...Object.keys(co), ...Object.keys(po)]);
  let hasDiff = false;

  for (const k of keys) {
    const cv = co[k];
    const pv = po[k];
    if (cv === pv) {
      continue;
    }

    try {
      if (JSON.stringify(cv) === JSON.stringify(pv)) {
        continue;
      }
    } catch {
      /* fall through to show diff */
    }

    hasDiff = true;
    if (Array.isArray(cv) || Array.isArray(pv)) {
      const pl = Array.isArray(pv) ? pv.length : 0;
      const cl = Array.isArray(cv) ? cv.length : 0;
      console.log(`   ${k}: [${pl}] → [${cl}]`);
    } else if (typeof cv === 'object' || typeof pv === 'object') {
      const pl = pv ? Object.keys(pv as object).length : 0;
      const cl = cv ? Object.keys(cv as object).length : 0;
      if (pl !== cl) {
        console.log(`   ${k}: {${pl}} → {${cl}}`);
      } else {
        console.log(`   ${k}: {changed}`);
      }
    } else {
      console.log(`   ${k}: ${fmt(pv, 20)} → ${fmt(cv, 20)}`);
    }
  }

  if (!hasDiff) {
    console.log('   (no field changes detected)');
  }
};
