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

import {forwardRef, useCallback, useMemo} from 'react';
import {Box, Row, Heading, Text, useTheme, Column, Spinner} from 'native-base';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BottomSheet, {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';

import {useSelector} from 'terraso-mobile-client/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {EmptySiteMessage} from 'terraso-mobile-client/screens/HomeScreen/components/EmptySiteMessage';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {SiteFilterModal} from 'terraso-mobile-client/screens/HomeScreen/components/SiteFilterModal';
import {getStartingSnapValue} from 'terraso-mobile-client/screens/HomeScreen/utils/getStartingSnapValue';
import {useListFilter} from 'terraso-mobile-client/components/ListFilter';

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
