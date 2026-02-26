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
 * Debug component: logs all non-trivial sync records to console
 * whenever the list changes, including field-level diffs.
 * Gated behind FF_testing.
 * Temporary — remove when offline sync is stable.
 */

import {useEffect, useRef} from 'react';

import type {Site} from 'terraso-client-shared/site/siteTypes';
import type {
  SoilData,
  SoilMetadata,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {
  getChangedSiteFields,
  getDeletedNotes,
  getNewNotes,
  getUpdatedNotes,
} from 'terraso-mobile-client/model/site/actions/siteDiff';
import {selectSiteChanges} from 'terraso-mobile-client/model/site/siteSelectors';
import {
  getChangedDepthDependentData,
  getChangedDepthIntervals,
  getChangedSoilDataFields,
  getDeletedDepthIntervals,
} from 'terraso-mobile-client/model/soilData/actions/soilDataDiff';
import {depthIntervalKey} from 'terraso-mobile-client/model/soilData/soilDataFunctions';
import {selectSoilChanges} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {unsyncedMetadataToMutationInput} from 'terraso-mobile-client/model/soilMetadata/soilMetadataPushUtils';
import {selectSoilMetadataChanges} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {
  isError,
  isUnsynced,
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {AppState, useSelector} from 'terraso-mobile-client/store';
import {selectSites} from 'terraso-mobile-client/store/selectors';

const B = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

type SyncEntry = {
  type: string;
  siteId: string;
  rec: SyncRecord<unknown, unknown>;
};

const getInteresting = (
  type: string,
  records: SyncRecords<unknown, unknown>,
): SyncEntry[] => {
  return Object.entries(records)
    .filter(
      ([_, r]) =>
        r.revisionId !== undefined || r.lastSyncedRevisionId !== undefined,
    )
    .map(([id, rec]) => ({type, siteId: id, rec}));
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

const entryKey = (e: SyncEntry): string =>
  `${e.type}:${e.siteId}:${e.rec.revisionId}:${e.rec.lastSyncedRevisionId}:${e.rec.lastSyncedError !== undefined}`;

const fmt = (v: unknown): string => {
  if (v === undefined || v === null) {
    return String(v);
  }
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > 30 ? s.slice(0, 30) + '…' : s;
};

const fmtFieldLines = (obj: Record<string, unknown>): string[] => {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${fmt(v)}`);
};

// --- Site diff ---

const logSiteDiff = (curr: Site, prev: Site | undefined) => {
  const tag = prev === undefined ? ' (new site)' : '';
  console.log(`              id: ${curr.id}${tag}`);
  const changed = getChangedSiteFields(curr, prev);
  const fieldLines = fmtFieldLines(changed);
  if (fieldLines.length > 0) {
    console.log('              fields:');
    for (const line of fieldLines) {
      console.log(`                ${line}`);
    }
  }

  const newNotes = getNewNotes(curr.notes, prev?.notes);
  const updated = getUpdatedNotes(curr.notes, prev?.notes);
  const deleted = getDeletedNotes(curr.notes, prev?.notes);
  if (newNotes.length > 0 || updated.length > 0 || deleted.length > 0) {
    console.log(
      `              notes: +${newNotes.length} new, ${updated.length} updated, ${deleted.length} deleted`,
    );
  }

  if (
    fieldLines.length === 0 &&
    newNotes.length === 0 &&
    updated.length === 0 &&
    deleted.length === 0
  ) {
    // no diff — skip silently
  }
};

// --- Soil data diff ---

const logSoilDataDiff = (curr: SoilData, prev: SoilData | undefined) => {
  const changed = getChangedSoilDataFields(curr, prev);
  const fieldLines = fmtFieldLines(changed);
  if (fieldLines.length > 0) {
    console.log('              fields:');
    for (const line of fieldLines) {
      console.log(`                ${line}`);
    }
  }

  const deletedDI = getDeletedDepthIntervals(curr, prev);
  for (const di of deletedDI) {
    console.log(`              deleted depth [${depthIntervalKey(di)}]`);
  }

  const changedDI = getChangedDepthIntervals(curr, prev);
  for (const di of changedDI) {
    const diLines = fmtFieldLines(di.changedFields);
    console.log(`              depth[${depthIntervalKey(di.depthInterval)}]:`);
    for (const line of diLines) {
      console.log(`                ${line}`);
    }
  }

  const changedDD = getChangedDepthDependentData(curr, prev);
  for (const dd of changedDD) {
    const ddLines = fmtFieldLines(dd.changedFields);
    console.log(
      `              depthDep[${depthIntervalKey(dd.depthInterval)}]:`,
    );
    for (const line of ddLines) {
      console.log(`                ${line}`);
    }
  }

  if (
    fieldLines.length === 0 &&
    deletedDI.length === 0 &&
    changedDI.length === 0 &&
    changedDD.length === 0
  ) {
    // no diff — skip silently
  }
};

// --- Soil metadata (shows what will be sent, not a diff) ---

const logSoilMetaPayload = (siteId: string, curr: SoilMetadata) => {
  const entries = unsyncedMetadataToMutationInput({[siteId]: curr});
  if (entries.length === 0) {
    console.log('              will send: (nothing)');
    return;
  }
  const ratings = entries[0].userRatings;
  if (ratings.length === 0) {
    console.log('              will send: 0 ratings');
    return;
  }
  const list = ratings
    .map(r => `${r.soilMatchId.slice(0, 8)}=${r.rating}`)
    .join(', ');
  console.log(`              will send: ${ratings.length} ratings (${list})`);
};

// --- Component ---

const selectAllSoilData = (state: AppState) => state.soilData.soilData;
const selectAllSoilMetadata = (state: AppState) =>
  state.soilMetadata.soilMetadata;

export const SyncRecordLogger = () => {
  const siteSync = useSelector(selectSiteChanges);
  const soilSync = useSelector(selectSoilChanges);
  const metadataSync = useSelector(selectSoilMetadataChanges);
  const sites = useSelector(selectSites);
  const soilData = useSelector(selectAllSoilData);
  const soilMetadata = useSelector(selectAllSoilMetadata);
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isFlagEnabled('FF_testing')) {
      return;
    }

    // Build list in push order: sites first, then soilData, soilMetadata
    const entries = [
      ...getInteresting('site', siteSync),
      ...getInteresting('soilData', soilSync),
      ...getInteresting('soilMeta', metadataSync),
    ];

    const key = entries.map(entryKey).join('|');
    if (key === prevKeyRef.current) {
      return;
    }
    prevKeyRef.current = key;

    console.log(B);
    if (entries.length === 0) {
      console.log('📋 SYNC RECORDS: (none)');
      return;
    }

    console.log('📋 SYNC RECORDS (push order)');
    for (const {type, siteId, rec} of entries) {
      const name = sites[siteId]?.name ?? siteId.slice(0, 8);
      const elevation = sites[siteId]?.elevation;
      const rv = String(rec.revisionId ?? '-');
      const sr = String(rec.lastSyncedRevisionId ?? '-');
      console.log(
        `   ${type.padEnd(10)} ${name.slice(0, 20).padEnd(20)} ${rv.padStart(2)}/${sr.padEnd(2)} ${statusLabel(rec)} e=${elevation}m`,
      );

      // Log diffs for each type
      if (type === 'site' && sites[siteId]) {
        logSiteDiff(sites[siteId], rec.lastSyncedData as Site | undefined);
      } else if (type === 'soilData' && soilData[siteId]) {
        logSoilDataDiff(
          soilData[siteId] as SoilData,
          rec.lastSyncedData as SoilData | undefined,
        );
      } else if (type === 'soilMeta' && soilMetadata[siteId]) {
        logSoilMetaPayload(siteId, soilMetadata[siteId]);
      }
    }
  }, [siteSync, soilSync, metadataSync, sites, soilData, soilMetadata]);

  return null;
};
