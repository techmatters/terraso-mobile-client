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
import {Box, Row, Heading, Text, useTheme, Column, Spinner} from 'native-base';
import {forwardRef, useCallback, useMemo} from 'react';
import {Linking} from 'react-native';
import {useSelector} from 'terraso-mobile-client/model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Trans, useTranslation} from 'react-i18next';
import {LinkNewWindowIcon} from 'terraso-mobile-client/components/common/Icons';
import {SiteCard} from 'terraso-mobile-client/components/sites/SiteCard';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import {USER_ROLES} from 'terraso-mobile-client/constants';
import {
  TextInputFilter,
  useListFilter,
  ListFilterModal,
  SelectFilter,
} from 'terraso-mobile-client/components/common/ListFilter';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const EmptySiteMessage = () => {
  const {t} = useTranslation();

  return (
    <Text px="17px" variant="body1">
      <Trans
        i18nKey="site.empty.info"
        components={{
          icon: <LinkNewWindowIcon />,
        }}>
        <Text
          underline
          onPress={() => Linking.openURL(t('site.empty.link_url'))}
          color="primary.main">
          link_text
        </Text>
      </Trans>
    </Text>
  );
};

/**
 * This function calculated the initial snap value to the bottom sheet depending on the device specifications.
 * To adjust this function consider change the result variable to desired minimum and maximum value
 * @param bottomInsets Bottom insets value of the device
 * @returns Starting snap value in %
 */
const getStartingSnapValue = (bottomInsets: number) => {
  // Set minimum and maximum snap values (percentage)
  const minimumSnapValue = 13;
  const maximumSnapValue = 16;

  // We set the maximum bottom insets as 34 which is the currently maximum for a device
  const weight0 = 1 - bottomInsets / 34; // Weight for 13
  const weight34 = 1 - weight0; // Weight for 16

  // Use the weights to calculate a weighted average
  const result = weight0 * minimumSnapValue + weight34 * maximumSnapValue;

  // Round the result
  return Math.round(result);
};

type Props = {
  sites: Site[];
  showSiteOnMap: (site: Site) => void;
  snapIndex?: number;
};

export const SiteListBottomSheet = forwardRef<BottomSheetMethods, Props>(
  ({sites, showSiteOnMap, snapIndex}, ref) => {
    const {t} = useTranslation();
    const isLoadingData = useSelector(state => state.soilId.loading);
    const deviceBottomInsets = useSafeAreaInsets().bottom;

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
      () => [
        `${getStartingSnapValue(deviceBottomInsets)}%`,
        sites.length === 0 ? '50%' : '75%',
        '100%',
      ],
      [sites.length, deviceBottomInsets],
    );

    const {colors} = useTheme();
    const listStyle = useMemo(() => ({paddingHorizontal: 16}), []);
    const backgroundStyle = useMemo(
      () => ({backgroundColor: colors.grey[300]}),
      [colors],
    );
    const {siteDistances} = useGeospatialContext();

    const useDistance = useMemo(() => siteDistances !== null, [siteDistances]);

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
          </Row>
          {sites.length >= 0 && <SiteFilterModal useDistance={useDistance} />}
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

type ModalProps = {
  useDistance: boolean;
};

const SiteFilterModal = ({useDistance}: ModalProps) => {
  const {t} = useTranslation();

  const roleOptions = Object.fromEntries(
    USER_ROLES.map(role => [role, t(`site.role.${role}`)]),
  );

  const distanceSortingOptions = useDistance
    ? ['distanceAsc', 'distanceDesc']
    : [];

  const sortOptions = Object.fromEntries(
    [
      'nameAsc',
      'nameDesc',
      'lastModAsc',
      'lastModDesc',
      ...distanceSortingOptions,
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
        nullableOption={t('general.filter.no_sort')}
      />
      <SelectFilter
        label={t('site.search.filter_role')}
        options={roleOptions}
        name="role"
        nullableOption={t('general.filter.no_role')}
      />
    </ListFilterModal>
  );
};
