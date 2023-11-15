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

import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {
  Box,
  Button,
  Row,
  Heading,
  Text,
  Link,
  useTheme,
  Column,
  FormControl,
  Select,
  Spinner,
} from 'native-base';
import {
  Dispatch,
  SetStateAction,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {useSelector} from 'terraso-mobile-client/model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {SiteCard} from 'terraso-mobile-client/components/sites/SiteCard';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import {SearchBar} from 'terraso-mobile-client/components/common/search/SearchBar';
import {SiteFilter} from 'terraso-mobile-client/components/sites/filter';
import {ProjectSelect} from 'terraso-mobile-client/components/projects/ProjectSelect';
import {USER_ROLES} from 'terraso-mobile-client/constants';

const EmptySiteMessage = () => {
  const {t} = useTranslation();

  return (
    <Text px="17px" variant="body1">
      <Text>{t('site.empty.info')}</Text>
      <Text>{'\n\n'}</Text>
      <Link isUnderlined={false} _text={{variant: 'body1'}}>
        {t('site.empty.link') + ' '}
        <Icon name="open-in-new" />
      </Link>
    </Text>
  );
};

type Props = {
  sites: Site[];
  filteredSites: Site[];
  showSiteOnMap: (site: Site) => void;
  onCreateSite: () => void;
  snapIndex?: number;
} & SiteSearchBarProps;
export const SiteListBottomSheet = forwardRef<BottomSheetMethods, Props>(
  (
    {
      sites,
      filteredSites,
      showSiteOnMap,
      onCreateSite,
      snapIndex,
      ...searchBarProps
    },
    ref,
  ) => {
    const {t} = useTranslation();
    const isLoadingData = useSelector(state => state.soilId.loading);

    const renderSite = useCallback(
      ({item}: {item: Site}) => (
        <SiteCard
          site={item}
          onShowSiteOnMap={showSiteOnMap}
          isPopover={false}
        />
      ),
      [showSiteOnMap],
    );

    const snapPoints = useMemo(
      () => ['15%', sites.length === 0 ? '50%' : '75%', '100%'],
      [sites.length],
    );

    const {colors} = useTheme();
    const listStyle = useMemo(() => ({paddingHorizontal: 16}), []);
    const backgroundStyle = useMemo(
      () => ({backgroundColor: colors.grey[300]}),
      [colors],
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        index={snapIndex}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={{backgroundColor: colors.grey[800]}}>
        <Column px="16px">
          <Row justifyContent="space-between" alignItems="center" pb="4">
            <Heading variant="h6">{t('site.list_title')}</Heading>
            <Button
              size="sm"
              onPress={onCreateSite}
              startIcon={<Icon name="add" />}>
              {t('site.create.title').toUpperCase()}
            </Button>
          </Row>
          {sites.length >= 0 && <SiteSearchBar {...searchBarProps} />}
        </Column>
        {isLoadingData ? (
          <Spinner size="lg" />
        ) : sites.length === 0 ? (
          <EmptySiteMessage />
        ) : (
          <BottomSheetFlatList
            style={listStyle}
            data={filteredSites}
            keyExtractor={site => site.id}
            renderItem={renderSite}
            ItemSeparatorComponent={() => <Box h="8px" />}
            ListFooterComponent={<Box h="10px" />}
            ListEmptyComponent={<Text>{t('site.search.no_matches')}</Text>}
          />
        )}
      </BottomSheet>
    );
  },
);

type SiteSearchBarProps = {
  query: string;
  setQuery: (query: string) => void;
  filter: SiteFilter;
  setFilter: (filter: SiteFilter) => void;
};
const SiteSearchBar = ({
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

type SiteFilterModalProps = {
  filter: SiteFilter;
  setFilter: Dispatch<SetStateAction<SiteFilter>>;
};
const SiteFilterModal = ({filter, setFilter}: SiteFilterModalProps) => {
  const {t} = useTranslation();
  return (
    <Column>
      <FormControl>
        <FormControl.Label>
          {t('site.search.filter_projects')}
        </FormControl.Label>
        <ProjectSelect
          projectId={filter.projectId}
          setProjectId={projectId => setFilter(prev => ({...prev, projectId}))}
        />
      </FormControl>
      <FormControl>
        <FormControl.Label>{t('site.search.filter_role')}</FormControl.Label>
        <Select
          selectedValue={filter.role}
          onValueChange={role => setFilter(prev => ({...prev, role}) as any)}>
          {USER_ROLES.map(role => (
            <Select.Item
              label={t(`site.role.${role}`)}
              value={role}
              key={role}
            />
          ))}
        </Select>
      </FormControl>
    </Column>
  );
};
