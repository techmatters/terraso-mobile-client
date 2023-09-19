import SiteMap from '../components/home/SiteMap';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import Mapbox, {Camera} from '@rnmapbox/maps';
import {Coords} from '../model/map/mapSlice';
import {useDispatch} from '../model/store';
import {useSelector} from '../model/store';
import {Site, fetchSitesForUser} from 'terraso-client-shared/site/siteSlice';
import {SiteListBottomSheet} from '../components/home/BottomSheet';
import {useNavigation} from './AppScaffold';
import {
  AppBarIconButton,
  AppBar,
  ScreenScaffold,
  useHeaderHeight,
} from './ScreenScaffold';
import {fetchProjectsForUser} from 'terraso-client-shared/project/projectSlice';
import MapSearch from '../components/home/MapSearch';
import {Box, Column, Heading, Image, Link, Text} from 'native-base';
import {coordsToPosition} from '../components/common/Map';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {Trans, useTranslation} from 'react-i18next';
import {Icon} from '../components/common/Icons';
import {CardCloseButton} from '../components/common/Card';
import {BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import {useTextSearch} from '../components/common/search/search';
import {useFilterSites} from '../components/sites/filter';

export type CalloutState =
  | {
      kind: 'site';
      siteId: string;
    }
  | {
      kind: 'location';
      coords: Coords;
      showCallout: boolean;
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
  const camera = useRef<Camera | null>(null);
  const {
    results: searchedSites,
    query: sitesQuery,
    setQuery: setSitesQuery,
  } = useTextSearch({data: siteList, keys: ['name']});
  const [siteFilter, setSiteFilter] = useState({});
  const filteredSites = useFilterSites(searchedSites, siteFilter);
  const filteredSitesById = Object.fromEntries(
    filteredSites.map(site => [site.id, site]),
  );

  useEffect(() => {
    // load sites on mount
    dispatch(fetchSitesForUser());
    dispatch(fetchProjectsForUser());
  }, [dispatch, currentUserID]);

  const currentUserLocation = useSelector(state => state.map.userLocation);
  const [initialLocation, setInitialLocation] = useState<Coords | null>(
    currentUserLocation,
  );

  useEffect(() => {
    if (initialLocation === null && currentUserLocation !== null) {
      setInitialLocation(currentUserLocation);
    }
  }, [initialLocation, currentUserLocation, setInitialLocation]);

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
    if (currentUserLocation !== null) {
      moveToPoint(currentUserLocation);
    }
  }, [currentUserLocation, moveToPoint]);

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
    () => infoBottomSheetRef?.current?.present(),
    [infoBottomSheetRef],
  );
  const onInfoClose = useCallback(
    () => infoBottomSheetRef?.current?.dismiss(),
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
              onCreateSite={onCreateSite}
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
          source={require('../../assets/landpks_intro_image.png')}
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
