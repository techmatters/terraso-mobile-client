import Mapbox, {Camera, Location, UserLocation} from '@rnmapbox/maps';
import {OnPressEvent} from '@rnmapbox/maps/src/types/OnPressEvent';
import {memo, useEffect, useMemo, useRef, useState} from 'react';
// TODO: Is it better to import type?
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import MaterialIconButton from '../common/MaterialIconButton';
import {v4 as uuidv4} from 'uuid';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Box, Heading, Text} from 'native-base';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from '../../constants';

type SiteMapProps = {
  center?: Position;
  updateUserLocation?: (location: Location) => void;
  sites: Record<string, Site>;
};

const siteFeatureCollection = (
  sites: Site[],
): GeoJSON.FeatureCollection<GeoJSON.Geometry> => ({
  type: 'FeatureCollection',
  features: sites.map(site => ({
    type: 'Feature',
    id: site.id,
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [site.longitude, site.latitude],
    },
  })),
});

const SiteCallout = ({site}: {site: Site}): JSX.Element => {
  return (
    <Mapbox.MarkerView
      coordinate={[site.longitude, site.latitude]}
      anchor={{x: 0.5, y: 0}}
      allowOverlap={true}>
      <Box backgroundColor="background.default">
        <Heading size="md">{site.name}</Heading>
        <Text>latitude: {site.latitude}</Text>
        <Text>longitude: {site.longitude}</Text>
      </Box>
    </Mapbox.MarkerView>
  );
};

const TemporarySiteCallout = ({site}: {site: Site}): JSX.Element => {
  return (
    <Mapbox.MarkerView
      coordinate={[site.longitude, site.latitude]}
      anchor={{x: 0.5, y: 0}}
      allowOverlap={true}>
      <Box backgroundColor="background.default">
        <Text>latitude: {site.latitude} </Text>
        <Text>longitude: {site.longitude}</Text>
      </Box>
    </Mapbox.MarkerView>
  );
};

const SiteMap = memo((props: SiteMapProps): JSX.Element => {
  const {center, updateUserLocation, sites} = props;
  const [temporarySites, setTemporarySites] = useState<Record<string, Site>>(
    {},
  );
  const [selectedSiteID, setSelectedSiteID] = useState<string | null>(null);
  const [selectedTemporarySiteID, setSelectedTemporarySiteID] = useState<
    string | null
  >(null);
  const selectedSite = selectedSiteID === null ? null : sites[selectedSiteID];
  const selectedTemporarySite =
    selectedTemporarySiteID === null
      ? null
      : temporarySites[selectedTemporarySiteID];
  const camera = useRef<Camera>(null);

  useEffect(() => {
    camera.current?.setCamera({
      centerCoordinate: center,
    });
  }, [center]);

  const sitesFeature = useMemo(
    () =>
      siteFeatureCollection(
        Object.values(sites).filter(site => !site.archived),
      ),
    [sites],
  );

  const temporarySitesFeature = useMemo(
    () => siteFeatureCollection(Object.values(temporarySites)),
    [temporarySites],
  );

  const onSitePress = (event: OnPressEvent) => {
    setSelectedSiteID(event.features[0].id as string);
    setSelectedTemporarySiteID(null);
  };

  const onTemporarySitePress = (event: OnPressEvent) => {
    setSelectedTemporarySiteID(event.features[0].id as string);
    setSelectedSiteID(null);
  };

  const onLongPress = (feature: GeoJSON.Feature) => {
    if (feature.geometry === null || feature.geometry.type !== 'Point') {
      console.error(
        'received long press with no feature geometry or non-Point geometry',
        feature.geometry,
      );
      return;
    }
    const [lon, lat] = feature.geometry.coordinates;
    const site: Site = {
      id: uuidv4(),
      name: 'temporary site',
      latitude: lat,
      longitude: lon,
      archived: false,
    };
    setTemporarySites({...temporarySites, [site.id]: site});
  };

  return (
    <Mapbox.MapView
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        flex: 1,
      }}
      onLongPress={onLongPress}>
      <Camera ref={camera} centerCoordinate={[0, 0]} />
      <Mapbox.Images images={{sitePin: ''}}>
        <Mapbox.Image name="sitePin">
          <MaterialIconButton name="location-on" />
        </Mapbox.Image>
      </Mapbox.Images>
      <Mapbox.ShapeSource
        id="sitesSource"
        shape={sitesFeature}
        onPress={onSitePress}>
        <Mapbox.SymbolLayer id="sitesLayer" style={styles.siteLayer} />
      </Mapbox.ShapeSource>
      <Mapbox.ShapeSource
        id="temporarySitesSource"
        shape={temporarySitesFeature}
        onPress={onTemporarySitePress}>
        <Mapbox.SymbolLayer id="temporarySitesLayer" style={styles.siteLayer} />
      </Mapbox.ShapeSource>
      <UserLocation
        onUpdate={updateUserLocation}
        minDisplacement={USER_DISPLACEMENT_MIN_DISTANCE_M}
      />
      {selectedSite && <SiteCallout site={selectedSite} />}
      {selectedTemporarySite && (
        <TemporarySiteCallout site={selectedTemporarySite} />
      )}
    </Mapbox.MapView>
  );
});

const styles = {
  siteLayer: {
    iconAllowOverlap: true,
    iconAnchor: 'bottom',
    iconSize: 1.0,
    iconImage: 'sitePin',
  } satisfies Mapbox.SymbolLayerStyle,
};

export default SiteMap;
