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
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import {useTheme} from 'native-base';

import {Site} from 'terraso-client-shared/site/siteTypes';

import {useListFilter} from 'terraso-mobile-client/components/ListFilter';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByConnectivity} from 'terraso-mobile-client/components/restrictions/RestrictByConnectivity';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {OfflineAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/OfflineAlert';
import {EmptySiteMessage} from 'terraso-mobile-client/screens/SitesScreen/components/EmptySiteMessage';
import {SiteFilterModal} from 'terraso-mobile-client/screens/SitesScreen/components/SiteFilterModal';
import {getStartingSnapValue} from 'terraso-mobile-client/screens/SitesScreen/utils/getStartingSnapValue';
import {useSelector} from 'terraso-mobile-client/store';

const WINDOW_SIZE = 3;
const MAX_TO_RENDER_PER_BATCH = 3;
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
        state => state.soilData.status === 'loading',
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
        () => [`${getStartingSnapValue(deviceBottomInsets)}%`, '50%', '75%'],
        [deviceBottomInsets],
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

      const ListEmptyComponent = useMemo(
        () => <Text>{t('site.search.no_matches')}</Text>,
        [t],
      );

      const isEmpty = sites.length === 0;

      const ListHeaderComponent = useMemo(
        () => (
          <>
            <Column px="16px">
              <Row justifyContent="flex-start" alignItems="center" pb="4">
                {isEmpty ? (
                  <>
                    <MaterialCommunityIcons
                      name="plus"
                      size={24}
                      color="black"
                      style={styles.communityIcon}
                    />
                    <Heading variant="h6">{t('site.list_title_empty')}</Heading>
                  </>
                ) : (
                  <Heading variant="h6">{t('site.list_title')}</Heading>
                )}
              </Row>
              {sites.length > 0 && (
                <SiteFilterModal useDistance={useDistance} />
              )}
            </Column>
            <RestrictByConnectivity offline={true}>
              <View style={styles.alertView}>
                <OfflineAlert message={t('site.offline.alert_body')} />
              </View>
            </RestrictByConnectivity>
          </>
        ),
        [isEmpty, t, sites.length, useDistance],
      );

      return (
        <BottomSheet
          ref={ref}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          index={snapIndex}
          backgroundStyle={backgroundStyle}
          handleIndicatorStyle={{backgroundColor: colors.grey[800]}}>
          {isLoadingData ? (
            <ActivityIndicator size="large" />
          ) : isEmpty ? (
            <BottomSheetScrollView>
              <EmptySiteMessage />
            </BottomSheetScrollView>
          ) : (
            <BottomSheetFlatList
              style={listStyle}
              data={filteredSites}
              maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
              windowSize={WINDOW_SIZE}
              keyExtractor={keyExtractor}
              renderItem={renderSite}
              ItemSeparatorComponent={ItemSeparatorComponent}
              ListHeaderComponent={ListHeaderComponent}
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

const styles = StyleSheet.create({
  communityIcon: {marginRight: 10},
  alertView: {margin: 16},
});
