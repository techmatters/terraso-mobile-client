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
 * whenever the list changes. Gated behind FF_testing.
 * Temporary — remove when offline sync is stable.
 */

import {useEffect, useRef} from 'react';

import {isFlagEnabled} from 'terraso-mobile-client/config/featureFlags';
import {selectSiteChanges} from 'terraso-mobile-client/model/site/siteSelectors';
import {selectSoilChanges} from 'terraso-mobile-client/model/soilData/soilDataSelectors';
import {selectSoilMetadataChanges} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSelectors';
import {
  isError,
  isUnsynced,
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSites} from 'terraso-mobile-client/store/selectors';

const B = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

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

const status = (rec: SyncRecord<unknown, unknown>): string => {
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

export const SyncRecordLogger = () => {
  const siteSync = useSelector(selectSiteChanges);
  const soilSync = useSelector(selectSoilChanges);
  const metadataSync = useSelector(selectSoilMetadataChanges);
  const sites = useSelector(selectSites);
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
      console.log(B);
      return;
    }

    console.log('📋 SYNC RECORDS (push order)');
    for (const {type, siteId, rec} of entries) {
      const name = sites[siteId]?.name ?? siteId.slice(0, 8);
      const rv = String(rec.revisionId ?? '-');
      const sr = String(rec.lastSyncedRevisionId ?? '-');
      console.log(
        `   ${type.padEnd(10)} ${name.slice(0, 20).padEnd(20)} ${rv.padStart(2)}/${sr.padEnd(2)} ${status(rec)}`,
      );
    }
    console.log(B);
  }, [siteSync, soilSync, metadataSync, sites]);

  return null;
};
