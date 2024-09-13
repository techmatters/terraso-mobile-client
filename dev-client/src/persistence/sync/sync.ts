import {
  LocalDataRepository,
  LocalDatum,
} from 'terraso-mobile-client/persistence/localData';

export type SyncFunction<T> = (
  dirty: Record<string, LocalDatum<T>>,
) => Promise<void>;

export class LocalDataSyncer<T> {
  constructor(
    private repository: LocalDataRepository<T>,
    private syncFunction: SyncFunction<T>,
  ) {}

  async runSync(): Promise<void> {
    const dirty = await this.repository.readDirty();
    await this.syncFunction(dirty);
    this.repository.markSynced(Object.keys(dirty));
  }
}
