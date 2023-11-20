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
  Spinner,
} from 'native-base';
import {forwardRef, useCallback, useMemo} from 'react';
import {useSelector} from 'terraso-mobile-client/model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {SiteCard} from 'terraso-mobile-client/components/sites/SiteCard';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import {USER_ROLES} from 'terraso-mobile-client/constants';
import {
  TextInputFilter,
  useListFilter,
  ListFilterModal,
  SelectFilter,
} from 'terraso-mobile-client/components/common/ListFilter';

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
  showSiteOnMap: (site: Site) => void;
  onCreateSite: () => void;
};
export const SiteListBottomSheet = forwardRef<BottomSheetMethods, Props>(
  ({sites, showSiteOnMap, onCreateSite}, ref) => {
    const {t} = useTranslation();
    const isLoadingData = useSelector(state => state.soilId.loading);

    const {filteredItems: filteredSites} = useListFilter<Site>();

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
          {sites.length >= 0 && <SiteFilterModal />}
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

const SiteFilterModal = () => {
  const {t} = useTranslation();

  const roleOptions = Object.fromEntries(
    USER_ROLES.map(role => [role, t(`site.role.${role}`)]),
  );

  const sortOptions = Object.fromEntries(
    [
      'nameAsc',
      'nameDesc',
      'lastModAsc',
      'lastModDesc',
      'distanceAsc',
      'distanceDesc',
    ].map(label => [label, t('site.search.sort.' + label)]),
  );

  return (
    <ListFilterModal
      searchInput={
        <TextInputFilter
          placeholder={t('site.search.placeholder')}
          label={t('site.search.accessibility_label')}
          name="search"
        />
      }>
      <SelectFilter
        label={t('site.search.sort.label')}
        options={sortOptions}
        name="sort"
      />
      <SelectFilter
        label={t('site.search.filter_role')}
        options={roleOptions}
        name="role"
      />
    </ListFilterModal>
  );
};
