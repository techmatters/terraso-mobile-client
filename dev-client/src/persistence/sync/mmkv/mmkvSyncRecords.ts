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

import {MMKVInstance} from 'react-native-mmkv-storage';

import {
  isSyncRecord,
  SyncRecord,
  SyncRepository,
} from 'terraso-mobile-client/persistence/sync/SyncRecords';

export class MmkvSyncRepository implements SyncRepository {
  constructor(
    private rootKey: string,
    private mmkv: MMKVInstance,
  ) {}

  async readDirty(): Promise<SyncRecord[]> {
    return await this.readRecords();
  }

  async markDirty(ids: string[]): Promise<void> {
    const now = Date.now();
    const idsSet = new Set(ids);
    const records = await this.readRecords();

    /* Update any records which are already dirty */
    records.forEach(record => {
      if (idsSet.has(record.id)) {
        record.updatedAt = now;
        idsSet.delete(record.id);
      }
    });

    /* Create new records for any remaining IDs */
    const newRecords = Array.from(idsSet.keys()).map(id => {
      return {
        id: id,
        createdAt: now,
        updatedAt: now,
      };
    });

    /* Combine existing and new records and write them to disk */
    const combinedRecords = records.concat(newRecords);
    this.writeRecords(combinedRecords);
  }

  async flush(ids: string[]): Promise<void> {
    const idsSet = new Set(ids);
    const records = await this.readRecords();

    /* Remove all flushed IDs from the records */
    const updatedRecords = records.filter(record => !idsSet.has(record.id));
    this.writeRecords(updatedRecords);
  }

  private async readRecords(): Promise<SyncRecord[]> {
    const array = await this.mmkv.getArrayAsync(this.rootKey);
    if (!array) {
      return [];
    } else {
      return array.filter(entry => isSyncRecord(entry)) as SyncRecord[];
    }
  }

  private async writeRecords(records: SyncRecord[]): Promise<void> {
    await this.mmkv.setArrayAsync(this.rootKey, records);
  }
}
