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

import SiteMap from 'terraso-mobile-client/screens/HomeScreen/components/SiteMap';
import {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import Mapbox, {Camera} from '@rnmapbox/maps';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {SiteListBottomSheet} from 'terraso-mobile-client/screens/HomeScreen/components/SiteListBottomSheet';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/components/AppBarIconButton';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import MapSearch from 'terraso-mobile-client/screens/HomeScreen/components/MapSearch';
import {coordsToPosition} from 'terraso-mobile-client/components/StaticMapView';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import {LandPKSInfoModal} from 'terraso-mobile-client/screens/HomeScreen/components/LandPKSInfoModal';
import {fetchSoilDataForUser} from 'terraso-client-shared/soilId/soilIdSlice';
import {selectSitesAndUserRoles} from 'terraso-client-shared/selectors';
import {
  ListFilterProvider,
  SortingOption,
} from 'terraso-mobile-client/components/ListFilter';
import {equals, searchText} from 'terraso-mobile-client/util';
import {useGeospatialContext} from 'terraso-mobile-client/context/GeospatialContext';
import {normalizeText} from 'terraso-client-shared/utils';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

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

type Props = {
  site?: Site;
};

export const HomeScreen = ({site}: Props) => {
  const infoBottomSheetRef = useRef<BottomSheetModal>(null);
  const siteListBottomSheetRef = useRef<BottomSheet>(null);
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
  const siteProjectRoles = useSelector(state => selectSitesAndUserRoles(state));

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

  const showSiteOnMap = useCallback(
    (targetSite: Site) => {
      moveToPoint(targetSite);
      setCalloutState({kind: 'site', siteId: targetSite.id});
      siteListBottomSheetRef.current?.collapse();
    },
    [moveToPoint, setCalloutState],
  );

  useEffect(() => {
    if (currentUserID !== undefined) {
      dispatch(fetchSoilDataForUser(currentUserID));
    }
  }, [dispatch, currentUserID]);

  // When a site is created, we pass site to HomeScreen
  // and then center that site on the map.
  useEffect(() => {
    if (site !== undefined) {
      showSiteOnMap(site);
    }
  }, [site, showSiteOnMap]);

  const currentUserCoords = useSelector(state => state.map.userLocation.coords);
  const [initialLocation, setInitialLocation] = useState<Coords | null>(
    currentUserCoords,
  );

  useEffect(() => {
    if (initialLocation === null && currentUserCoords !== null) {
      setInitialLocation(currentUserCoords);
    }
  }, [initialLocation, currentUserCoords, setInitialLocation]);

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

  const onInfo = useCallback(
    () => infoBottomSheetRef.current?.present(),
    [infoBottomSheetRef],
  );
  const onInfoClose = useCallback(
    () => infoBottomSheetRef.current?.dismiss(),
    [infoBottomSheetRef],
  );

  const {siteDistances} = useGeospatialContext();

  const distanceSorting: Record<string, SortingOption<Site>> | undefined =
    useMemo(() => {
      return siteDistances === null
        ? undefined
        : {
            distanceAsc: {
              record: siteDistances,
              key: 'id',
              order: 'ascending',
            },
            distanceDesc: {
              record: siteDistances,
              key: 'id',
              order: 'descending',
            },
          };
    }, [siteDistances]);

  return (
    <BottomSheetModalProvider>
      <ListFilterProvider
        items={siteList}
        filters={{
          search: {
            kind: 'filter',
            f: searchText,
            preprocess: normalizeText,
            lookup: {
              key: ['name', 'notes.content'],
            },
            hide: true,
          },
          role: {
            kind: 'filter',
            f: equals,
            lookup: {
              record: siteProjectRoles,
              key: 'id',
            },
          },
          project: {
            kind: 'filter',
            f: equals,
            lookup: {
              key: 'projectId',
            },
          },
          sort: {
            kind: 'sorting',
            options: {
              nameDesc: {
                key: 'name',
                order: 'descending',
              },
              nameAsc: {
                key: 'name',
                order: 'ascending',
              },
              lastModDesc: {
                key: 'updatedAt',
                order: 'descending',
              },
              lastModAsc: {
                key: 'updatedAt',
                order: 'ascending',
              },
              ...distanceSorting,
            },
          },
        }}>
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
              showSiteOnMap={showSiteOnMap}
              snapIndex={1}
            />
          </Box>
          <LandPKSInfoModal ref={infoBottomSheetRef} onClose={onInfoClose} />
        </ScreenScaffold>
      </ListFilterProvider>
    </BottomSheetModalProvider>
  );
};
