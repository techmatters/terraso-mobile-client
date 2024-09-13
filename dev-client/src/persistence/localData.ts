export interface LocalDataRepository<T> {
  read(): Promise<Record<string, LocalDatum<T>>>;
  readDirty(): Promise<Record<string, LocalDatum<T>>>;

  write(records: Record<string, T>): Promise<void>;
  markSynced(ids: string[]): Promise<void>;
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
  'content',
] as const;

export const checkLocalDatum = <T>(value: any): LocalDatum<T> | undefined => {
  return isLocalDatum(value) ? (value as LocalDatum<T>) : undefined;
};

export const isLocalDatum = (value: any): boolean => {
  return (
    typeof value === 'object' &&
    LocalDatumRequiredFields.find(field => !(field in value)) !== undefined
  );
};
