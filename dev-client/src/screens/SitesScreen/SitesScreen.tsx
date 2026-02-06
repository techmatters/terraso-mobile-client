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

import {FeatureFlagPollingTrigger} from 'terraso-mobile-client/app/posthog/PostHog';
import {LandPKSInfoButton} from 'terraso-mobile-client/components/content/info/landpks/LandPKSInfoButton';
import {ListFilterProvider} from 'terraso-mobile-client/components/ListFilter';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PosthogBanner} from 'terraso-mobile-client/components/PosthogBanner';
import {positionToCoords} from 'terraso-mobile-client/components/StaticMapView';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {SitesScreenContext} from 'terraso-mobile-client/context/SitesScreenContext';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {MapHeader} from 'terraso-mobile-client/screens/SitesScreen/components/MapHeader';
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
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSites,
  selectSitesAndUserRoles,
} from 'terraso-mobile-client/store/selectors';

export const SitesScreen = memo(() => {
  const siteListBottomSheetRef = useRef<BottomSheet>(null);
  const [mapStyleURL, setMapStyleURL] = useState(Mapbox.StyleURL.Street);
  const [calloutState, setCalloutState] = useState<CalloutState>(noneCallout());
  const sites = useSelector(selectSites);
  const siteList = useMemo(() => Object.values(sites), [sites]);
  const mapRef = useRef<MapRef>(null);
  const siteProjectRoles = useSelector(selectSitesAndUserRoles);
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
      setCalloutState(locationCallout(coords, false, 'address'));
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
        <Box testID="sites-screen" flex={1}>
          <FeatureFlagPollingTrigger />
          <PosthogBanner />
          <Box flex={1}>
            <MapHeader
              zoomTo={searchFunction}
              zoomToUser={moveToUserAndShowCallout}
              toggleMapLayer={toggleMapLayer}
              isCalloutOpen={calloutState.kind !== 'none'}
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
