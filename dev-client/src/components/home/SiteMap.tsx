import Mapbox, {Camera, Location, UserLocation} from '@rnmapbox/maps';
import {OnPressEvent} from '@rnmapbox/maps/src/types/OnPressEvent';
import {memo, useMemo, useCallback, forwardRef, ForwardedRef} from 'react';
import {Card, CardCloseButton} from '../common/Card';
import MapIcon from 'react-native-vector-icons/MaterialIcons';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Box, Row, Text, Divider, Button, useTheme, Column} from 'native-base';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from '../../constants';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '../../screens/AppScaffold';
import {CameraRef} from '@rnmapbox/maps/lib/typescript/components/Camera';
import {SiteCard} from '../sites/SiteCard';
import {Keyboard, StyleSheet} from 'react-native';
import {CalloutState} from '../../screens/HomeScreen';
import {positionToCoords} from '../common/Map';
import {Coords} from '../../model/map/mapSlice';

type SiteMapProps = {
  updateUserLocation?: (location: Location) => void;
  sites: Record<string, Site>;
  calloutState: CalloutState;
  setCalloutState: (state: CalloutState) => void;
  styleURL?: string;
  onCreateSite: () => void;
};

const siteFeatureCollection = (
  sites: Pick<Site, 'id' | 'latitude' | 'longitude'>[],
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

type SiteCalloutProps = {
  site: Site;
  closeCallout: () => void;
};
const SiteCallout = ({site, closeCallout}: SiteCalloutProps) => {
  return (
    <Mapbox.MarkerView
      coordinate={[site.longitude, site.latitude]}
      anchor={{x: 0.5, y: 0}}
      allowOverlap={true}>
      <SiteCard
        site={site}
        topRightButton={<CardCloseButton onPress={closeCallout} />}
      />
    </Mapbox.MarkerView>
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
  site: Coords;
  onCreate: () => void;
  onLearnMore: () => void;
  closeCallout: () => void;
};
const TemporarySiteCallout = ({
  site,
  closeCallout,
  onCreate,
  onLearnMore,
}: TemporarySiteCalloutProps) => {
  const {t} = useTranslation();

  return (
    <Mapbox.MarkerView
      coordinate={[site.longitude, site.latitude]}
      anchor={{x: 0.5, y: 0}}
      allowOverlap={true}>
      <Card topRightButton={<CardCloseButton onPress={closeCallout} />}>
        <Column space="12px">
          <CalloutDetail label={t('site.soil_id_prediction')} value="CLIFTON" />
          <Divider />
          <CalloutDetail
            label={t('site.ecological_site_prediction')}
            value="LOAMY UPLAND"
          />
          <Divider />
          <CalloutDetail
            label={t('site.annual_precip_avg')}
            value="28 INCHES"
          />
          <Divider />
          <CalloutDetail label={t('site.elevation')} value="2800 FEET" />
          <Divider />
          <Row justifyContent="flex-end">
            <Button onPress={onCreate} size="sm" variant="outline">
              {t('site.create')}
            </Button>
            <Box width="24px" />
            <Button onPress={onLearnMore} size="sm">
              {t('site.more_info')}
            </Button>
          </Row>
        </Column>
      </Card>
    </Mapbox.MarkerView>
  );
};

const SiteMap = (
  props: SiteMapProps,
  ref: ForwardedRef<CameraRef>,
): JSX.Element => {
  const {
    updateUserLocation,
    sites,
    setCalloutState,
    calloutState,
    onCreateSite,
    styleURL,
  } = props;
  const selectedSite =
    calloutState.kind === 'site' ? sites[calloutState.siteId] : null;
  const {navigate} = useNavigation();
  const {colors} = useTheme();

  const sitesFeature = useMemo(
    () =>
      siteFeatureCollection(
        Object.values(sites).filter(site => !site.archived),
      ),
    [sites],
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

  const temporaryLearnMoreCallback = useCallback(() => {
    setCalloutState({kind: 'none'});
    if (calloutState.kind === 'location') {
      navigate('LOCATION_DASHBOARD', {
        coords: calloutState.coords,
      });
    }
  }, [navigate, calloutState, setCalloutState]);

  const closeCallout = useCallback(
    () => setCalloutState({kind: 'none'}),
    [setCalloutState],
  );

  const onSitePress = useCallback(
    (event: OnPressEvent) =>
      setCalloutState({kind: 'site', siteId: event.features[0].id as string}),
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

  const onLongPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (feature.geometry === null || feature.geometry.type !== 'Point') {
        console.error(
          'received long press with no feature geometry or non-Point geometry',
          feature.geometry,
        );
        return;
      }
      setCalloutState({
        kind: 'location',
        coords: positionToCoords(feature.geometry.coordinates),
        showCallout: true,
      });
    },
    [setCalloutState],
  );

  return (
    <Mapbox.MapView
      style={styles.mapView}
      onPress={() => Keyboard.dismiss()}
      onLongPress={onLongPress}
      scaleBarEnabled={false}
      styleURL={styleURL}>
      <Camera ref={ref} />
      <Mapbox.Images
        onImageMissing={console.debug}
        images={{
          sitePin: MapIcon.getImageSourceSync(
            'location-on',
            undefined,
            colors.secondary.main,
          ),
          temporarySitePin: MapIcon.getImageSourceSync(
            'location-on',
            undefined,
            colors.action.active,
          ),
        }}
      />
      <Mapbox.ShapeSource
        id="sitesSource"
        shape={sitesFeature}
        onPress={onSitePress}>
        <Mapbox.SymbolLayer id="sitesLayer" style={mapStyles.siteLayer} />
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
      {selectedSite && (
        <SiteCallout site={selectedSite} closeCallout={closeCallout} />
      )}
      {calloutState.kind === 'location' && calloutState.showCallout && (
        <TemporarySiteCallout
          site={calloutState.coords}
          closeCallout={closeCallout}
          onCreate={onCreateSite}
          onLearnMore={temporaryLearnMoreCallback}
        />
      )}
    </Mapbox.MapView>
  );
};

const styles = StyleSheet.create({
  mapView: {
    flex: 1,
  },
});

const mapStyles = {
  siteLayer: {
    iconAllowOverlap: true,
    iconAnchor: 'bottom',
    iconSize: 4.0,
    iconImage: 'sitePin',
  } satisfies Mapbox.SymbolLayerStyle,
  temporarySiteLayer: {
    iconAllowOverlap: true,
    iconAnchor: 'bottom',
    iconSize: 4.0,
    iconImage: 'temporarySitePin',
  } satisfies Mapbox.SymbolLayerStyle,
};

export default memo(forwardRef<CameraRef, SiteMapProps>(SiteMap));
