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

import BottomSheet from '@gorhom/bottom-sheet';
import Mapbox from '@rnmapbox/maps';

import {Site} from 'terraso-client-shared/site/siteTypes';
import {Coords} from 'terraso-client-shared/types';

import {LandPKSInfoButton} from 'terraso-mobile-client/components/content/info/landpks/LandPKSInfoButton';
import {ListFilterProvider} from 'terraso-mobile-client/components/ListFilter';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {positionToCoords} from 'terraso-mobile-client/components/StaticMapView';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {SitesScreenContext} from 'terraso-mobile-client/context/SitesScreenContext';
import {fetchSoilDataForUser} from 'terraso-mobile-client/model/soilData/soilDataGlobalReducer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import MapSearch from 'terraso-mobile-client/screens/SitesScreen/components/MapSearch';
import {SiteListBottomSheet} from 'terraso-mobile-client/screens/SitesScreen/components/SiteListBottomSheet';
import {
  MapRef,
  SiteMap,
} from 'terraso-mobile-client/screens/SitesScreen/components/SiteMap';
import {
  CalloutState,
  locationCallout,
  noneCallout,
  siteCallout,
} from 'terraso-mobile-client/screens/SitesScreen/SitesScreenCallout';
import {getSitesScreenFilters} from 'terraso-mobile-client/screens/SitesScreen/utils/sitesScreenFilters';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectSitesAndUserRoles} from 'terraso-mobile-client/store/selectors';

export const SitesScreen = memo(() => {
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
  const sitesScreenContext = useContext(SitesScreenContext);

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
    sitesScreenContext,
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

  const moveToUserAndShowCallout = useCallback(() => {
    if (currentUserCoords !== null) {
      mapRef.current?.moveToPoint(currentUserCoords);
      setCalloutState(
        locationCallout(
          positionToCoords([
            currentUserCoords.longitude,
            currentUserCoords.latitude,
          ]),
          true,
        ),
      );
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

  const {siteDistances} = useGeospatialContext();

  const filters = useMemo(
    () => getSitesScreenFilters(siteDistances, siteProjectRoles),
    [siteDistances, siteProjectRoles],
  );

  return (
    <ScreenScaffold
      AppBar={<AppBar LeftButton={null} RightButton={<LandPKSInfoButton />} />}>
      <ListFilterProvider items={siteList} filters={filters}>
        <Box flex={1}>
          <Box flex={1} zIndex={-1}>
            <MapSearch
              zoomTo={searchFunction}
              zoomToUser={moveToUserAndShowCallout}
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
      </ListFilterProvider>
    </ScreenScaffold>
  );
});
