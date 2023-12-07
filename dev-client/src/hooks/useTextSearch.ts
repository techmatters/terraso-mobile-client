/*
 * Copyright © 2023 Technology Matters
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

import {useMemo, useState} from 'react';
import {normalizeText} from 'terraso-client-shared/utils';

type TextSearchOptions<K extends string, T extends Record<K, string>> = {
  data: T[];
  keys: K[];
};

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
