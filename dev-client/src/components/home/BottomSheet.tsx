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
} from 'native-base';
import {
  Dispatch,
  SetStateAction,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useTranslation} from 'react-i18next';
import {Icon} from '../common/Icons';
import {SiteCard} from '../sites/SiteCard';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import {SearchBar} from '../common/search/SearchBar';
import {SiteFilter} from '../sites/filter';
import {ProjectSelect} from '../projects/ProjectSelect';

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
} & SiteSearchBarProps;
export const SiteListBottomSheet = forwardRef<BottomSheetMethods, Props>(
  (
    {sites, filteredSites, showSiteOnMap, onCreateSite, ...searchBarProps},
    ref,
  ) => {
    const {t} = useTranslation();

    const renderSite = useCallback(
      ({item}: {item: Site}) => (
        <SiteCard site={item} onShowSiteOnMap={showSiteOnMap} />
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
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={{backgroundColor: colors.grey[800]}}>
        <Column paddingX="16px">
          <Row
            justifyContent="space-between"
            alignItems="center"
            paddingBottom="4">
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
        {sites.length === 0 ? (
          <EmptySiteMessage />
        ) : (
          <BottomSheetFlatList
            style={listStyle}
            data={filteredSites}
            keyExtractor={site => site.id}
            renderItem={renderSite}
            ItemSeparatorComponent={() => <Box height="8px" />}
            ListFooterComponent={<Box height="10px" />}
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
          {['MANAGER', 'CONTRIBUTOR', 'VIEWER'].map(role => (
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
