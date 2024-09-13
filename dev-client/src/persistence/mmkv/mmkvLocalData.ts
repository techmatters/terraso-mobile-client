import {MMKVInstance} from 'react-native-mmkv-storage';

import {
  checkLocalDatum,
  LocalDataRepository,
  LocalDatum,
} from 'terraso-mobile-client/persistence/localData';

export class MmkvLocalDataRepository<T> implements LocalDataRepository<T> {
  constructor(
    private rootKey: string,
    private mmkv: MMKVInstance,
  ) {}

  async readAll(): Promise<Record<string, LocalDatum<T>>> {
    return await this.readRecords();
  }

  async readDirty(): Promise<Record<string, LocalDatum<T>>> {
    const records = await this.readRecords();
    return Object.fromEntries(
      Object.entries(records).filter(([_, value]) => value.isDirty),
    );
  }

  async writeAll(records: Record<string, T>): Promise<void> {
    const now = Date.now();
    const existingRecords = await this.readRecords();
    Object.entries(records).forEach(([key, value]) => {
      existingRecords[key] = {
        isDirty: true,
        writtenAt: now,
        syncedAt: null,
        content: value,
      };
    });
    await this.writeRecords(existingRecords);
  }

  async write(id: string, data: T): Promise<void> {
    let records: Record<string, T> = {};
    records[id] = data;
    await this.writeAll(records);
  }

  async markSynced(ids: string[], syncedAt: number): Promise<void> {
    const records = await this.readRecords();
    ids.forEach(id => {
      records[id].isDirty = false;
      records[id].syncedAt = syncedAt;
    });
    await this.writeRecords(records);
  }

  private async readRecords(): Promise<Record<string, LocalDatum<T>>> {
    const map = await this.mmkv.getMapAsync(this.rootKey);
    if (typeof map === 'object') {
      const result: Record<string, LocalDatum<T>> = {};
      Object.entries(map as object)
        .map(([key, value]) => {
          return {key: key, value: checkLocalDatum<T>(value)};
        })
        .filter(({value}) => typeof value !== 'undefined')
        .forEach(({key, value}) => (result[key] = value!));
      return result;
    } else {
      return {};
    }
  }

  private async writeRecords(
    records: Record<string, LocalDatum<T>>,
  ): Promise<void> {
    await this.mmkv.setMapAsync(this.rootKey, records);
  }
}
