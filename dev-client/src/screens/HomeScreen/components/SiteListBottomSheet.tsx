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

import {forwardRef, memo, useCallback, useMemo} from 'react';
import {Heading, Text, useTheme, Spinner} from 'native-base';
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
import {
  Box,
  Row,
  Column,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

// TODO(performance): Same as in ProjectList.tsx
const WINDOW_SIZE = 3;
const MAX_TO_RENDER_PER_BATCH = 3;
// const ITEM_HEIGHT = ??
const SEPARATOR_HEIGHT = 8;

type Props = {
  sites: Site[];
  showSiteOnMap: (site: Site) => void;
  snapIndex?: number;
};

export const SiteListBottomSheet = memo(
  forwardRef<BottomSheetMethods, Props>(
    ({sites, showSiteOnMap, snapIndex}, ref) => {
      const {t} = useTranslation();
      const isLoadingData = useSelector(
        state => state.soilId.status === 'loading',
      );
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

      const useDistance = useMemo(
        () => siteDistances !== null,
        [siteDistances],
      );

      // TODO(performance): Same as in ProjectList.tsx
      // const getItemLayout = useCallback((_: any, index: number) => {
      //   const itemHeight = ITEM_HEIGHT + SEPARATOR_HEIGHT;
      //   const offset = itemHeight * index;
      //   return {length: itemHeight, offset, index};
      // }, []);

      const ListEmptyComponent = useMemo(
        () => <Text>{t('site.search.no_matches')}</Text>,
        [t],
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
              maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
              windowSize={WINDOW_SIZE}
              // getItemLayout={getItemLayout}
              keyExtractor={keyExtractor}
              renderItem={renderSite}
              ItemSeparatorComponent={ItemSeparatorComponent}
              ListFooterComponent={ListFooterComponent}
              ListEmptyComponent={ListEmptyComponent}
            />
          )}
        </BottomSheet>
      );
    },
  ),
);

const keyExtractor = (site: Site) => site.id;
const ItemSeparatorComponent = () => <Box h={`${SEPARATOR_HEIGHT}px`} />;
const ListFooterComponent = <Box h="10px" />;
