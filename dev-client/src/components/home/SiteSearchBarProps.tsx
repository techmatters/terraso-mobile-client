import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {SiteFilter} from 'terraso-mobile-client/components/sites/filter.hooks';
import {SiteFilterModal} from './SiteFilterModal';

export type SiteSearchBarProps = {
  query: string;
  setQuery: (query: string) => void;
  filter: SiteFilter;
  setFilter: (filter: SiteFilter) => void;
};
export const SiteSearchBar = ({
  query,
  setQuery,
  filter,
  setFilter,
}: SiteSearchBarProps) => {
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
