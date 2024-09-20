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

import {AppState} from 'terraso-mobile-client/store';

export interface SyncRepository {
  readDirty(): Promise<SyncRecord[]>;
  markDirty(ids: string[]): Promise<void>;
  flush(ids: string[]): Promise<void>;
}

export type SyncRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export const SyncRecordRequiredFields = [
  'id',
  'createdAt',
  'updatedAt',
] as const;

export const checkSyncRecord = (value: any): SyncRecord | undefined => {
  return isSyncRecord(value) ? (value as SyncRecord) : undefined;
};

export const isSyncRecord = (value: any): boolean => {
  return (
    typeof value === 'object' &&
    SyncRecordRequiredFields.find(field => !(field in value)) !== undefined
  );
};

export type SelectorFunction<T> = (
  state: AppState,
  dirty: SyncRecord[],
) => Record<string, T>;
export type SyncFunction<T> = (dirty: Record<string, T>) => Promise<void>;

export class SyncRunner<T> {
  constructor(
    private repo: SyncRepository,
    private selector: SelectorFunction<T>,
    private sync: SyncFunction<T>,
  ) {}

  async synchronize(currentState: AppState): Promise<void> {
    const dirty = await this.repo.readDirty();
    const records = this.selector(currentState, dirty);
    await this.sync(records);
    await this.repo.flush(Object.keys(records));
  }
}
