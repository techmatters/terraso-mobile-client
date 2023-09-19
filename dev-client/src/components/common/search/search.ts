import {useMemo, useState} from 'react';

type TextSearchOptions<K extends string, T extends Record<K, string>> = {
  data: T[];
  keys: K[];
};

const normalizeText = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // unicode range for combining diacritical marks

export const useTextSearch = <K extends string, T extends Record<K, string>>({
  data,
  keys,
}: TextSearchOptions<K, T>) => {
  const [query, setQuery] = useState('');
  const normalizedQuery = useMemo(() => normalizeText(query), [query]);
  const results = useMemo(() => {
    if (normalizedQuery.length <= 1) {
      return data;
    }
    return data.filter(
      datum =>
        !keys.every(
          key =>
            normalizeText(datum[key] as string).indexOf(normalizedQuery) === -1,
        ),
    );
  }, [data, normalizedQuery, keys]);
  return {results, query, setQuery};
};
