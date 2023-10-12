import Mapbox, {Camera, Location, UserLocation} from '@rnmapbox/maps';
import {OnPressEvent} from '@rnmapbox/maps/src/types/OnPressEvent';
import {
  memo,
  useMemo,
  useCallback,
  forwardRef,
  ForwardedRef,
  useRef,
  useImperativeHandle,
} from 'react';
import {
  Card,
  CardCloseButton,
} from 'terraso-mobile-client/components/common/Card';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {
  Box,
  Row,
  Text,
  Divider,
  Button,
  useTheme,
  Column,
  FlatList,
  Heading,
} from 'native-base';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {CameraRef} from '@rnmapbox/maps/lib/typescript/components/Camera';
import {SiteCard} from 'terraso-mobile-client/components/sites/SiteCard';
import {
  Keyboard,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import {CalloutState} from 'terraso-mobile-client/screens/HomeScreen';
import {
  coordsToPosition,
  mapIconSizeForPlatform,
  positionToCoords,
} from 'terraso-mobile-client/components/common/Map';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {useSelector} from 'terraso-mobile-client/model/store';

const TEMP_SOIL_ID_VALUE = 'Clifton';
const TEMP_ECO_SITE_PREDICTION = 'Loamy Upland';
const TEMP_PRECIPITATION = '28 inches';
const TEMP_ELEVATION = '2800 feet';
const MAX_EXPANSION_ZOOM = 15;

type SiteMapProps = {
  updateUserLocation?: (location: Location) => void;
  sites: Record<string, Site>;
  calloutState: CalloutState;
  setCalloutState: (state: CalloutState) => void;
  styleURL?: string;
};

const siteFeatureCollection = (
  sites: Pick<Site, 'id' | 'latitude' | 'longitude'>[],
): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
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

type SiteMapCalloutProps = {
  sites: Record<string, Site>;
  state: CalloutState;
  setState: (state: CalloutState) => void;
};
const SiteMapCallout = ({sites, state, setState}: SiteMapCalloutProps) => {
  const closeCallout = useCallback(() => setState({kind: 'none'}), [setState]);

  if (state.kind === 'none') {
    return null;
  }

  const coords = state.kind === 'site' ? sites[state.siteId] : state.coords;

  let child: React.ComponentProps<typeof Mapbox.MarkerView>['children'];

  if (state.kind === 'site') {
    child = (
      <SiteCard
        site={sites[state.siteId]}
        buttons={<CardCloseButton onPress={closeCallout} />}
      />
    );
  } else if (state.kind === 'site_cluster') {
    child = (
      <Card width="270px" buttons={<CardCloseButton onPress={closeCallout} />}>
        <FlatList
          data={state.siteIds}
          keyExtractor={id => id}
          renderItem={({item: id}) => (
            <SiteClusterCalloutListItem site={sites[id]} setState={setState} />
          )}
          ItemSeparatorComponent={() => <Divider my="10px" />}
        />
      </Card>
    );
  } else if (state.kind === 'location') {
    child = (
      <TemporarySiteCallout coords={coords} closeCallout={closeCallout} />
    );
  } else {
    return null;
  }

  return (
    <Mapbox.MarkerView
      coordinate={coordsToPosition(coords)}
      anchor={{x: 0.5, y: 0}}
      allowOverlap>
      {child}
    </Mapbox.MarkerView>
  );
};

type SiteClusterCalloutListItemProps = {
  site: Site;
  setState: (state: CalloutState) => void;
};
const SiteClusterCalloutListItem = ({
  site,
  setState,
}: SiteClusterCalloutListItemProps) => {
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );
  const onPress = useCallback(() => {
    setState({kind: 'site', siteId: site.id});
  }, [site.id, setState]);

  return (
    <Pressable onPress={onPress}>
      <Column>
        <Heading variant="h6" color="primary.main">
          {site.name}
        </Heading>
        {project && <Text variant="body1">{project.name}</Text>}
      </Column>
    </Pressable>
  );
};

const CalloutDetail = ({label, value}: {label: string; value: string}) => {
  return (
    <Box>
      <Text>{label}</Text>
      <Text bold>{value}</Text>
    </Box>
  );
};

type TemporarySiteCalloutProps = {
  coords: Coords;
  closeCallout: () => void;
};
const TemporarySiteCallout = ({
  coords,
  closeCallout,
}: TemporarySiteCalloutProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {coords});
    closeCallout();
  }, [closeCallout, navigation, coords]);
  const onLearnMore = useCallback(() => {
    navigation.navigate('LOCATION_DASHBOARD', {coords});
  }, [navigation, coords]);

  return (
    <Card buttons={<CardCloseButton onPress={closeCallout} />}>
      <Column space="12px">
        <CalloutDetail
          label={t('site.soil_id_prediction').toUpperCase()}
          value={TEMP_SOIL_ID_VALUE.toUpperCase()}
        />
        <Divider />
        <CalloutDetail
          label={t('site.ecological_site_prediction').toUpperCase()}
          value={TEMP_ECO_SITE_PREDICTION.toUpperCase()}
        />
        <Divider />
        <CalloutDetail
          label={t('site.annual_precip_avg').toUpperCase()}
          value={TEMP_PRECIPITATION.toUpperCase()}
        />
        <Divider />
        <CalloutDetail
          label={t('site.elevation').toUpperCase()}
          value={TEMP_ELEVATION.toUpperCase()}
        />
        <Divider />
        <Row justifyContent="flex-end">
          <Button onPress={onCreate} size="sm" variant="outline">
            {t('site.create.title').toUpperCase()}
          </Button>
          <Box w="24px" />
          <Button onPress={onLearnMore} size="sm">
            {t('site.more_info').toUpperCase()}
          </Button>
        </Row>
      </Column>
    </Card>
  );
};

const SiteMap = (
  {
    updateUserLocation,
    sites,
    setCalloutState,
    calloutState,
    styleURL,
  }: SiteMapProps,
  forwardedCameraRef: ForwardedRef<CameraRef>,
): JSX.Element => {
  const mapRef = useRef<Mapbox.MapView>(null);
  const shapeSourceRef = useRef<Mapbox.ShapeSource>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  useImperativeHandle(forwardedCameraRef, () => cameraRef.current!);

  const selectedSite =
    calloutState.kind === 'site' ? sites[calloutState.siteId] : null;

  const {colors} = useTheme();

  const selectedSiteFeature = useMemo(
    () => siteFeatureCollection(selectedSite === null ? [] : [selectedSite]),
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

  const onSitePress = useCallback(
    async (event: OnPressEvent) => {
      const feature = event.features[0];
      if (
        feature.properties &&
        'cluster' in feature.properties &&
        feature.properties.cluster
      ) {
        const shapeSource = shapeSourceRef.current;
        if (shapeSource === null) {
          return;
        }
        const expansionZoom =
          await shapeSource.getClusterExpansionZoom(feature);
        const targetZoom = Math.min(expansionZoom, MAX_EXPANSION_ZOOM);
        const currentZoom = await mapRef.current?.getZoom();
        if (currentZoom === undefined) {
          return;
        }
        if (targetZoom > currentZoom) {
          if (feature.geometry === null || feature.geometry.type !== 'Point') {
            console.error(
              'received cluster with no feature geometry or non-Point geometry',
              feature.geometry,
            );
            return;
          }

          cameraRef?.current?.setCamera({
            zoomLevel: targetZoom,
            centerCoordinate: feature.geometry.coordinates,
            animationDuration: 500 + (targetZoom - currentZoom) * 100,
            animationMode: 'easeTo',
          });
          return;
        }

        const leafFeatures = (await shapeSource.getClusterLeaves(
          feature,
          100,
          0,
        )) as GeoJSON.FeatureCollection;

        setCalloutState({
          kind: 'site_cluster',
          coords: positionToCoords(
            (feature.geometry as GeoJSON.Point).coordinates,
          ),
          siteIds: leafFeatures.features.map(feat => feat.id as string),
        });
      } else {
        cameraRef?.current?.setCamera({
          centerCoordinate: feature.geometry.coordinates,
          animationDuration: 500,
          animationMode: 'easeTo',
        });
        setCalloutState({kind: 'site', siteId: event.features[0].id as string});
      }
    },
    [setCalloutState],
  );

  const onTempSitePress = useCallback(
    () =>
      setCalloutState(
        calloutState.kind === 'location'
          ? {...calloutState, showCallout: true}
          : calloutState,
      ),
    [calloutState, setCalloutState],
  );

  const onPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (feature.geometry !== null && feature.geometry.type === 'Point') {
        setCalloutState({
          kind: 'location',
          coords: positionToCoords(feature.geometry.coordinates),
          showCallout: true,
        });
      } else {
        Keyboard.dismiss();
        setCalloutState({kind: 'none'});
      }
    },
    [setCalloutState],
  );

  const mapImages = useMemo(
    () => ({
      sitePin: Icon.getImageSourceSync(
        'location-on',
        mapIconSizeForPlatform(35),
        colors.secondary.main,
      ),
      selectedSitePin: Icon.getImageSourceSync(
        'location-on',
        mapIconSizeForPlatform(64),
        colors.secondary.main,
      ),
      temporarySitePin: Icon.getImageSourceSync(
        'location-on',
        mapIconSizeForPlatform(35),
        colors.action.active,
      ),
    }),
    [colors],
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
        circleRadius:
          35 / Platform.select({android: PixelRatio.get(), default: 1}),
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
      onPress={onPress}>
      <Camera ref={cameraRef} />
      <Mapbox.Images images={mapImages} />
      <Mapbox.ShapeSource id="selectedSiteSource" shape={selectedSiteFeature}>
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
        shape={temporarySitesFeature}
        onPress={onTempSitePress}>
        <Mapbox.SymbolLayer
          id="temporarySitesLayer"
          style={mapStyles.temporarySiteLayer}
        />
      </Mapbox.ShapeSource>
      <UserLocation
        onUpdate={updateUserLocation}
        minDisplacement={USER_DISPLACEMENT_MIN_DISTANCE_M}
      />
      <SiteMapCallout
        sites={sites}
        state={calloutState}
        setState={setCalloutState}
      />
    </Mapbox.MapView>
  );
};

const styles = StyleSheet.create({
  mapView: {
    flex: 1,
  },
});

export default memo(forwardRef<CameraRef, SiteMapProps>(SiteMap));
