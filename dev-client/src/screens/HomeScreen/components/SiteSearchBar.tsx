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
