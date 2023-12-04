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

import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SearchBar} from 'terraso-mobile-client/components/SearchBar';
import {SiteFilter} from 'terraso-mobile-client/screens/HomeScreen/hooks/useFilterSites';
import {SiteFilterModal} from 'terraso-mobile-client/screens/HomeScreen/components/SiteFilterModal';

export type Props = {
  query: string;
  setQuery: (query: string) => void;
  filter: SiteFilter;
  setFilter: (filter: SiteFilter) => void;
};

export const SiteSearchBar = ({query, setQuery, filter, setFilter}: Props) => {
  const {t} = useTranslation();
  const numFilters = Object.values(filter).filter(
    value => value !== undefined,
  ).length;
  const [tempFilter, setTempFilter] = useState(filter);

  return (
    <SearchBar
      query={query}
      setQuery={setQuery}
      numFilters={numFilters}
      placeholder={t('site.search.placeholder')}
      FilterOptions={
        <SiteFilterModal filter={tempFilter} setFilter={setTempFilter} />
      }
      onApplyFilter={() => setFilter(tempFilter)}
    />
  );
};
