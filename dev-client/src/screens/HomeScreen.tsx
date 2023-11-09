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

import SiteMap from 'terraso-mobile-client/components/home/SiteMap';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import Mapbox, {Camera} from '@rnmapbox/maps';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {SiteListBottomSheet} from 'terraso-mobile-client/components/home/BottomSheet';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {
  AppBarIconButton,
  AppBar,
  ScreenScaffold,
  useHeaderHeight,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import MapSearch from 'terraso-mobile-client/components/home/MapSearch';
import {Box, Column, Heading, Image, Link, Text} from 'native-base';
import {coordsToPosition} from 'terraso-mobile-client/components/common/Map';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {Trans, useTranslation} from 'react-i18next';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {CardCloseButton} from 'terraso-mobile-client/components/common/Card';
import {BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import {useTextSearch} from 'terraso-mobile-client/components/common/search/search';
import {useFilterSites} from 'terraso-mobile-client/components/sites/filter';
import {fetchSoilDataForUser} from 'terraso-client-shared/soilId/soilIdSlice';
import {selectSitesAndUserRoles} from 'terraso-client-shared/selectors';

export type CalloutState =
  | {
      kind: 'site';
      siteId: string;
    }
  | {
      kind: 'location';
      showCallout: boolean;
      coords: Coords;
    }
  | {
      kind: 'site_cluster';
      siteIds: string[];
      coords: Coords;
    }
  | {kind: 'none'};

const STARTING_ZOOM_LEVEL = 12;

export const HomeScreen = () => {
  const infoBottomSheetRef = useRef<BottomSheetModal>(null);
  const siteListBottomSheetRef = useRef<BottomSheet>(null);
  const navigation = useNavigation();
  const [mapStyleURL, setMapStyleURL] = useState(Mapbox.StyleURL.Street);
  const [calloutState, setCalloutState] = useState<CalloutState>({
    kind: 'none',
  });
  const currentUserID = useSelector(
    state => state.account.currentUser?.data?.id,
  );
  const sites = useSelector(state => state.site.sites);
  const siteList = useMemo(() => Object.values(sites), [sites]);
  const dispatch = useDispatch();
  const camera = useRef<Camera>(null);
  const {
    results: searchedSites,
    query: sitesQuery,
    setQuery: setSitesQuery,
  } = useTextSearch({data: siteList, keys: ['name']});
  const [siteFilter, setSiteFilter] = useState({});
  const siteProjectRoles = useSelector(state => selectSitesAndUserRoles(state));
  const filteredSites = useFilterSites(
    searchedSites,
    siteProjectRoles,
    siteFilter,
  );
  const filteredSitesById = Object.fromEntries(
    filteredSites.map(site => [site.id, site]),
  );

  useEffect(() => {
    if (currentUserID !== undefined) {
      dispatch(fetchSoilDataForUser(currentUserID));
    }
  }, [dispatch, currentUserID]);

  const currentUserCoords = useSelector(state => state.map.userLocation.coords);
  const [initialLocation, setInitialLocation] = useState<Coords | null>(
    currentUserCoords,
  );

  useEffect(() => {
    if (initialLocation === null && currentUserCoords !== null) {
      setInitialLocation(currentUserCoords);
    }
  }, [initialLocation, currentUserCoords, setInitialLocation]);

  const moveToPoint = useCallback(
    (coords: Coords) => {
      // TODO: flyTo, zoomTo don't seem to work, find out why
      //camera.current?.flyTo([longitude, latitude]);
      //camera.current?.zoomTo(STARTING_ZOOM_LEVEL);
      camera.current?.setCamera({
        centerCoordinate: coordsToPosition(coords),
        zoomLevel: STARTING_ZOOM_LEVEL,
      });
    },
    [camera],
  );

  const [finishedInitialCameraMove, setFinishedInitialCameraMove] =
    useState(false);

  const onMapFinishedLoading = useCallback(() => {
    if (finishedInitialCameraMove !== true && initialLocation !== null) {
      moveToPoint(initialLocation);
      setFinishedInitialCameraMove(true);
    }
  }, [initialLocation, moveToPoint, finishedInitialCameraMove]);

  useEffect(() => {
    if (initialLocation !== null && camera.current !== undefined) {
      moveToPoint(initialLocation);
    }
  }, [initialLocation, camera, moveToPoint]);

  const searchFunction = useCallback(
    (coords: Coords) => {
      setCalloutState({kind: 'location', showCallout: false, coords});
      moveToPoint(coords);
    },
    [setCalloutState, moveToPoint],
  );

  const moveToUser = useCallback(() => {
    if (currentUserCoords !== null) {
      moveToPoint(currentUserCoords);
    }
  }, [currentUserCoords, moveToPoint]);

  const toggleMapLayer = useCallback(
    () =>
      setMapStyleURL(
        mapStyleURL === Mapbox.StyleURL.Street
          ? Mapbox.StyleURL.Satellite
          : Mapbox.StyleURL.Street,
      ),
    [mapStyleURL, setMapStyleURL],
  );

  const showSiteOnMap = useCallback(
    (site: Site) => {
      moveToPoint(site);
      setCalloutState({kind: 'site', siteId: site.id});
      siteListBottomSheetRef.current?.collapse();
    },
    [moveToPoint, setCalloutState],
  );

  const onCreateSite = useCallback(() => {
    navigation.navigate(
      'CREATE_SITE',
      calloutState.kind === 'location'
        ? {coords: calloutState.coords}
        : undefined,
    );
    setCalloutState({kind: 'none'});
  }, [navigation, calloutState]);

  const onInfo = useCallback(
    () => infoBottomSheetRef.current?.present(),
    [infoBottomSheetRef],
  );
  const onInfoClose = useCallback(
    () => infoBottomSheetRef.current?.dismiss(),
    [infoBottomSheetRef],
  );

  return (
    <BottomSheetModalProvider>
      <ScreenScaffold
        AppBar={
          <AppBar
            LeftButton={<AppBarIconButton name="menu" />}
            RightButton={<AppBarIconButton name="info" onPress={onInfo} />}
          />
        }>
        <Box flex={1}>
          <Box flex={1} zIndex={-1}>
            <MapSearch
              zoomTo={searchFunction}
              zoomToUser={moveToUser}
              toggleMapLayer={toggleMapLayer}
            />
            <SiteMap
              sites={filteredSitesById}
              ref={camera}
              calloutState={calloutState}
              setCalloutState={setCalloutState}
              styleURL={mapStyleURL}
              onMapFinishedLoading={onMapFinishedLoading}
            />
          </Box>
          <SiteListBottomSheet
            ref={siteListBottomSheetRef}
            sites={siteList}
            filteredSites={filteredSites}
            showSiteOnMap={showSiteOnMap}
            onCreateSite={onCreateSite}
            query={sitesQuery}
            setQuery={setSitesQuery}
            filter={siteFilter}
            setFilter={setSiteFilter}
          />
        </Box>
        <InfoModal ref={infoBottomSheetRef} onClose={onInfoClose} />
      </ScreenScaffold>
    </BottomSheetModalProvider>
  );
};

const InfoModal = forwardRef<BottomSheetModal, {onClose: () => void}>(
  ({onClose}, ref) => {
    const headerHeight = useHeaderHeight();
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['100%']}
        handleComponent={null}
        topInset={headerHeight}
        backdropComponent={BackdropComponent}>
        <LandPKSInfo />
        <Box position="absolute" top="18px" right="23px">
          <CardCloseButton onPress={onClose} />
        </Box>
      </BottomSheetModal>
    );
  },
);

const BackdropComponent = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
);

const LandPKSInfo = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" px={5} mt="48px">
        <Heading w="full" textAlign="center">
          {t('home.info.title')}
        </Heading>
        <Image
          source={require('terraso-mobile-client/assets/landpks_intro_image.png')}
          w="100%"
          h="30%"
          resizeMode="contain"
          alt={t('home.info.intro_image_alt')}
        />
        <Text>
          <Text bold>{t('home.info.description.lead')} </Text>
          {t('home.info.description.body')}
        </Text>
        <Text alignItems="center">
          <Text bold>{t('home.info.location.lead')} </Text>
          <Trans
            i18nKey="home.info.location.body"
            components={{
              icon: (
                <Icon
                  name="my-location"
                  color="action.active"
                  position="relative"
                />
              ),
            }}
          />
        </Text>
        <Text>
          <Text bold>{t('home.info.search.lead')} </Text>
          {t('home.info.search.body')}
        </Text>
        <Text>
          <Text bold>{t('home.info.learn_more.lead')} </Text>
          <Trans
            i18nKey="home.info.learn_more.body"
            components={{
              // note: "link" is a reserved word for the Trans component, cannot use as key here
              // see https://react.i18next.com/latest/trans-component#alternative-usage-which-lists-the-components-v11.6.0
              landpks: <Link isExternal pt={2} />,
            }}
          />
        </Text>
      </Column>
    </BottomSheetScrollView>
  );
};
