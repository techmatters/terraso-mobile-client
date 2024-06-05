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

import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import BottomSheet, {BottomSheetModal} from '@gorhom/bottom-sheet';
import Mapbox from '@rnmapbox/maps';

import {selectSitesAndUserRoles} from 'terraso-client-shared/selectors';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {fetchSoilDataForUser} from 'terraso-client-shared/soilId/soilIdSlice';
import {Coords} from 'terraso-client-shared/types';

import {ListFilterProvider} from 'terraso-mobile-client/components/ListFilter';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {HomeScreenContextProvider} from 'terraso-mobile-client/context/HomeScreenContext';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/components/AppBarIconButton';
import {LandPKSInfoModal} from 'terraso-mobile-client/screens/HomeScreen/components/LandPKSInfoModal';
import MapSearch from 'terraso-mobile-client/screens/HomeScreen/components/MapSearch';
import {SiteListBottomSheet} from 'terraso-mobile-client/screens/HomeScreen/components/SiteListBottomSheet';
import {
  MapRef,
  SiteMap,
} from 'terraso-mobile-client/screens/HomeScreen/components/SiteMap';
import {
  CalloutState,
  locationCallout,
  noneCallout,
  siteCallout,
} from 'terraso-mobile-client/screens/HomeScreen/HomeScreenCallout';
import {getHomeScreenFilters} from 'terraso-mobile-client/screens/HomeScreen/utils/homeScreenFilters';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const HomeScreen = memo(() => {
  const infoBottomSheetRef = useRef<BottomSheetModal>(null);
  const siteListBottomSheetRef = useRef<BottomSheet>(null);
  const [mapStyleURL, setMapStyleURL] = useState(Mapbox.StyleURL.Street);
  const [calloutState, setCalloutState] = useState<CalloutState>(noneCallout());
  const currentUserID = useSelector(
    state => state.account.currentUser?.data?.id,
  );
  const sites = useSelector(state => state.site.sites);
  const siteList = useMemo(() => Object.values(sites), [sites]);
  const dispatch = useDispatch();
  const mapRef = useRef<MapRef>(null);
  const siteProjectRoles = useSelector(state => selectSitesAndUserRoles(state));
  const homeScreenContext = useContext(HomeScreenContextProvider);

  const showSiteOnMap = useCallback(
    (targetSite: Site) => {
      mapRef.current?.moveToPoint(targetSite);
      setCalloutState(siteCallout(targetSite.id));
      siteListBottomSheetRef.current?.collapse();
    },
    [setCalloutState],
  );

  const collapseBottomSheet = useCallback(() => {
    siteListBottomSheetRef.current?.collapse();
  }, []);

  useImperativeHandle(
    homeScreenContext,
    () => ({
      showSiteOnMap,
      collapseBottomSheet,
    }),
    [showSiteOnMap, collapseBottomSheet],
  );

  useEffect(() => {
    if (currentUserID !== undefined) {
      dispatch(fetchSoilDataForUser(currentUserID));
    }
  }, [dispatch, currentUserID]);

  const currentUserCoords = useSelector(state => state.map.userLocation.coords);

  const [finishedLoading, setFinishedLoading] = useState(false);
  const [finishedInitialCameraMove, setFinishedInitialCameraMove] =
    useState(false);

  const onMapFinishedLoading = useCallback(() => {
    setFinishedLoading(true);
  }, [setFinishedLoading]);

  useEffect(() => {
    if (
      !finishedInitialCameraMove &&
      finishedLoading &&
      currentUserCoords !== null
    ) {
      mapRef.current?.moveToPoint(currentUserCoords);
      setFinishedInitialCameraMove(true);
    }
  }, [finishedLoading, finishedInitialCameraMove, currentUserCoords]);

  const searchFunction = useCallback(
    (coords: Coords) => {
      setCalloutState(locationCallout(coords));
      mapRef.current?.moveToPoint(coords);
    },
    [setCalloutState, mapRef],
  );

  const moveToUser = useCallback(() => {
    if (currentUserCoords !== null) {
      mapRef.current?.moveToPoint(currentUserCoords);
    }
  }, [currentUserCoords, mapRef]);

  const toggleMapLayer = useCallback(
    () =>
      setMapStyleURL(
        mapStyleURL === Mapbox.StyleURL.Street
          ? Mapbox.StyleURL.Satellite
          : Mapbox.StyleURL.Street,
      ),
    [mapStyleURL, setMapStyleURL],
  );

  const onInfo = useCallback(
    () => infoBottomSheetRef.current?.present(),
    [infoBottomSheetRef],
  );
  const onInfoClose = useCallback(
    () => infoBottomSheetRef.current?.dismiss(),
    [infoBottomSheetRef],
  );

  const {siteDistances} = useGeospatialContext();

  const filters = useMemo(
    () => getHomeScreenFilters(siteDistances, siteProjectRoles),
    [siteDistances, siteProjectRoles],
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={null}
          RightButton={<AppBarIconButton name="info" onPress={onInfo} />}
        />
      }>
      <ListFilterProvider items={siteList} filters={filters}>
        <Box flex={1}>
          <Box flex={1} zIndex={-1}>
            <MapSearch
              zoomTo={searchFunction}
              zoomToUser={moveToUser}
              toggleMapLayer={toggleMapLayer}
            />
            <SiteMap
              ref={mapRef}
              calloutState={calloutState}
              setCalloutState={setCalloutState}
              styleURL={mapStyleURL}
              onMapFinishedLoading={onMapFinishedLoading}
            />
          </Box>
          <SiteListBottomSheet
            ref={siteListBottomSheetRef}
            sites={siteList}
            showSiteOnMap={showSiteOnMap}
            snapIndex={1}
          />
        </Box>
        <LandPKSInfoModal ref={infoBottomSheetRef} onClose={onInfoClose} />
      </ListFilterProvider>
    </ScreenScaffold>
  );
});
