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
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {Keyboard, PixelRatio, StyleSheet} from 'react-native';

import Mapbox, {Camera, Location} from '@rnmapbox/maps';
import {OnPressEvent} from '@rnmapbox/maps/src/types/OnPressEvent';
import {useTheme} from 'native-base';

import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-client-shared/types';

import {useListFilter} from 'terraso-mobile-client/components/ListFilter';
import {
  coordsToPosition,
  positionToCoords,
} from 'terraso-mobile-client/components/StaticMapView';
import {useHomeScreenContext} from 'terraso-mobile-client/context/HomeScreenContext';
import {CustomUserLocation} from 'terraso-mobile-client/screens/HomeScreen/components/CustomUserLocation';
import {SiteMapCallout} from 'terraso-mobile-client/screens/HomeScreen/components/SiteMapCallout';
import {
  CalloutState,
  getCalloutSite,
  locationCallout,
  noneCallout,
  siteCallout,
  siteClusterCallout,
} from 'terraso-mobile-client/screens/HomeScreen/HomeScreenCallout';
import {repositionCamera} from 'terraso-mobile-client/screens/HomeScreen/utils/repositionCamera';
import {siteFeatureCollection} from 'terraso-mobile-client/screens/HomeScreen/utils/siteFeatureCollection';

const DEFAULT_LOCATION = [-98.0, 38.5];
const MAX_EXPANSION_ZOOM = 15;
const STARTING_ZOOM_LEVEL = 12;

type Props = {
  updateUserLocation?: (location: Location) => void;
  calloutState: CalloutState;
  setCalloutState: (state: CalloutState) => void;
  styleURL?: string;
  onMapFinishedLoading?: () => void;
};

export type MapRef = {
  moveToPoint: (coords: Coords) => void;
};

export const SiteMap = memo(
  forwardRef<MapRef, Props>(
    (
      {
        updateUserLocation,
        setCalloutState,
        calloutState,
        styleURL,
        onMapFinishedLoading,
      },
      forwardedRef,
    ): React.JSX.Element => {
      const mapRef = useRef<Mapbox.MapView>(null);
      const shapeSourceRef = useRef<Mapbox.ShapeSource>(null);
      const cameraRef = useRef<Mapbox.Camera>(null);

      useImperativeHandle(forwardedRef, () => ({
        moveToPoint: (coords: Coords) => {
          cameraRef.current?.setCamera({
            centerCoordinate: coordsToPosition(coords),
            zoomLevel: STARTING_ZOOM_LEVEL,
          });
        },
      }));
      const homeScreen = useHomeScreenContext();

      const {filteredItems: filteredSites} = useListFilter<Site>();
      const sites = Object.fromEntries(
        filteredSites.map(site => [site.id, site]),
      );
      const selectedSite = getCalloutSite(calloutState, sites);

      const {colors} = useTheme();

      const selectedSiteFeature = useMemo(
        () =>
          siteFeatureCollection(selectedSite === null ? [] : [selectedSite]),
        [selectedSite],
      );

      const sitesFeature = useMemo(
        () =>
          siteFeatureCollection(
            Object.values(sites).filter(
              site => !site.archived && site.id !== selectedSite?.id,
            ),
          ),
        [selectedSite, sites],
      );

      const temporarySitesFeature = useMemo(
        () =>
          siteFeatureCollection(
            calloutState.kind !== 'location'
              ? []
              : [{...calloutState.coords, id: 'temp'}],
          ),
        [calloutState],
      );

      const handleClusterPress = useCallback(
        async (feature: GeoJSON.Feature, currentZoom: number) => {
          const shapeSource = shapeSourceRef.current;
          if (!shapeSource) {
            return;
          }

          const expansionZoom =
            await shapeSource.getClusterExpansionZoom(feature);
          const targetZoom = Math.min(expansionZoom, MAX_EXPANSION_ZOOM);

          if (targetZoom > currentZoom) {
            const animationDuration = 500 + (targetZoom - currentZoom) * 100;
            repositionCamera({
              feature: feature,
              zoomLevel: targetZoom,
              animationDuration: animationDuration,
              paddingBottom: 0,
              cameraRef: cameraRef,
            });
          } else {
            const leafFeatures = (await shapeSource.getClusterLeaves(
              feature,
              100,
              0,
            )) as GeoJSON.FeatureCollection;

            setCalloutState(
              siteClusterCallout(
                positionToCoords(
                  (feature.geometry as GeoJSON.Point).coordinates,
                ),
                leafFeatures.features.map(feat => feat.id as string),
              ),
            );
          }
        },
        [shapeSourceRef, setCalloutState],
      );

      const onSitePress = useCallback(
        async (event: OnPressEvent) => {
          const feature = event.features[0];
          const currentZoom = await mapRef.current?.getZoom();
          if (!currentZoom) {
            console.error('Unable to fetch the current zoom level');
            return;
          }

          if (
            feature.properties &&
            'cluster' in feature.properties &&
            feature.properties.cluster
          ) {
            await handleClusterPress(feature, currentZoom);
          } else {
            repositionCamera({
              feature: feature,
              zoomLevel: currentZoom,
              animationDuration: 500,
              paddingBottom: 0,
              cameraRef: cameraRef,
            });
            setCalloutState(siteCallout(feature.id as string));
            homeScreen?.collapseBottomSheet();
          }
        },
        [setCalloutState, handleClusterPress, homeScreen],
      );

      const onPress = useCallback(
        async (
          feature: GeoJSON.Feature,
          isCurrentLocation: boolean = false,
        ) => {
          if (
            calloutState.kind === 'none' &&
            feature.geometry?.type === 'Point'
          ) {
            const currentZoom = await mapRef.current?.getZoom();
            if (!currentZoom) {
              console.error('Unable to fetch the current zoom level');
              return;
            }

            repositionCamera({
              feature: feature,
              zoomLevel: currentZoom,
              animationDuration: 500,
              paddingBottom: 320,
              cameraRef: cameraRef,
            });
            setCalloutState(
              locationCallout(
                positionToCoords(feature.geometry.coordinates),
                isCurrentLocation,
              ),
            );
          } else {
            Keyboard.dismiss();
            setCalloutState(noneCallout());
          }
        },
        [calloutState, setCalloutState],
      );

      const onUserLocationPress = useCallback(
        async (event?: GeoJSON.GeoJsonProperties) => {
          if (event?.features[0]) {
            const feature = event.features[0];
            onPress(feature, true);
          }
        },
        [onPress],
      );

      const mapStyles = useMemo(
        () => ({
          siteLayer: {
            iconAllowOverlap: true,
            iconAnchor: 'bottom',
            iconImage: 'sitePin',
          } satisfies Mapbox.SymbolLayerStyle,
          selectedSiteLayer: {
            iconAllowOverlap: true,
            iconAnchor: 'bottom',
            iconImage: 'selectedSitePin',
          } satisfies Mapbox.SymbolLayerStyle,
          siteClusterCircleLayer: {
            circleRadius: 35 / PixelRatio.get(),
            circleColor: colors.secondary.main,
          } satisfies Mapbox.CircleLayerStyle,
          siteClusterTextLayer: {
            textField: ['get', 'point_count_abbreviated'],
            textSize: 13,
            textColor: colors.primary.contrast,
          } satisfies Mapbox.SymbolLayerStyle,
          temporarySiteLayer: {
            iconAllowOverlap: true,
            iconAnchor: 'bottom',
            iconImage: 'temporarySitePin',
          } satisfies Mapbox.SymbolLayerStyle,
        }),
        [colors],
      );

      return (
        <Mapbox.MapView
          ref={mapRef}
          style={styles.mapView}
          scaleBarEnabled={false}
          styleURL={styleURL}
          onPress={onPress}
          onDidFinishLoadingMap={onMapFinishedLoading}>
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: DEFAULT_LOCATION,
              zoomLevel: 3,
            }}
          />
          <Mapbox.Images images={mapImages} />
          <Mapbox.ShapeSource
            id="selectedSiteSource"
            shape={selectedSiteFeature}>
            <Mapbox.SymbolLayer
              id="selectedSiteLayer"
              style={mapStyles.selectedSiteLayer}
            />
          </Mapbox.ShapeSource>
          <Mapbox.ShapeSource
            ref={shapeSourceRef}
            id="sitesSource"
            shape={sitesFeature}
            onPress={onSitePress}
            cluster
            clusterMaxZoomLevel={20}
            clusterRadius={50}>
            <Mapbox.SymbolLayer
              id="sitesLayer"
              style={mapStyles.siteLayer}
              filter={['all', ['!', ['has', 'point_count']]]}
            />
            <Mapbox.CircleLayer
              id="siteClusterCircleLayer"
              belowLayerID="sitesLayer"
              style={mapStyles.siteClusterCircleLayer}
              filter={['has', 'point_count']}
            />
            <Mapbox.SymbolLayer
              id="siteClusterTextLayer"
              style={mapStyles.siteClusterTextLayer}
              filter={['has', 'point_count']}
            />
          </Mapbox.ShapeSource>
          <Mapbox.ShapeSource
            id="temporarySitesSource"
            shape={temporarySitesFeature}>
            <Mapbox.SymbolLayer
              id="temporarySitesLayer"
              style={mapStyles.temporarySiteLayer}
            />
          </Mapbox.ShapeSource>
          <CustomUserLocation
            onUserLocationPress={onUserLocationPress}
            updateUserLocation={updateUserLocation}
          />
          <SiteMapCallout
            sites={sites}
            state={calloutState}
            setState={setCalloutState}
          />
        </Mapbox.MapView>
      );
    },
  ),
);

const mapImages = {
  sitePin: require('terraso-mobile-client/assets/map/location.png'),
  selectedSitePin: require('terraso-mobile-client/assets/map/selected-location.png'),
  temporarySitePin: require('terraso-mobile-client/assets/map/temporary-location.png'),
};

const styles = StyleSheet.create({
  mapView: {
    flex: 1,
  },
});
