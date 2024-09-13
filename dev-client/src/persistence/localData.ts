export interface LocalDataRepository<T> {
  readAll(): Promise<Record<string, LocalDatum<T>>>;
  readDirty(): Promise<Record<string, LocalDatum<T>>>;

  writeAll(records: Record<string, T>): Promise<void>;
  write(id: string, data: T): Promise<void>;
  markSynced(ids: string[], syncedAt: number): Promise<void>;
}

export type LocalDatum<T> = {
  isDirty: boolean;
  writtenAt: number;
  syncedAt: number | null;
  content: T;
};

export const LocalDatumRequiredFields = [
  'dirty',
  'writtenAt',
  'syncedAt',
  'formatVersion',
  'content',
] as const;

export const checkLocalDatum = <T>(
  value: object,
): LocalDatum<T> | undefined => {
  return isLocalDatum(value) ? (value as LocalDatum<T>) : undefined;
};

export const isLocalDatum = (value: any): boolean => {
  return (
    typeof value === 'object' &&
    LocalDatumRequiredFields.find(field => !(field in value)) !== undefined
  );
};
