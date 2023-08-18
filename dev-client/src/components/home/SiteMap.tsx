import Mapbox, {Camera, Location, UserLocation} from '@rnmapbox/maps';
import {OnPressEvent} from '@rnmapbox/maps/src/types/OnPressEvent';
import {
  memo,
  useMemo,
  useState,
  useCallback,
  forwardRef,
  ForwardedRef,
} from 'react';
import {Card, CardCloseButton} from '../common/Card';
import MapIcon from 'react-native-vector-icons/MaterialIcons';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Box, Row, Text, Divider, Button, useTheme, Column} from 'native-base';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from '../../constants';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '../../screens/AppScaffold';
import {CameraRef} from '@rnmapbox/maps/lib/typescript/components/Camera';
import {SiteCard} from '../sites/SiteCard';
import {TempSiteDisplay} from '../../screens/HomeScreen';

type SiteMapProps = {
  updateUserLocation?: (location: Location) => void;
  sites: Record<string, Site>;
  temporarySite: null | TempSiteDisplay;
  setTemporarySite: (site: TempSiteDisplay | null) => void;
  showCallout: () => void;
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
  site: Pick<Site, 'latitude' | 'longitude'>;
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
    setTemporarySite,
    temporarySite,
    showCallout,
  } = props;
  const [selectedSiteID, setSelectedSiteID] = useState<string | null>(null);
  const selectedSite = selectedSiteID === null ? null : sites[selectedSiteID];
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
        temporarySite === null ? [] : [{...temporarySite.site, id: 'temp'}],
      ),
    [temporarySite],
  );

  const temporaryCreateCallback = useCallback(() => {
    const siteToCreate: Pick<Site, 'longitude' | 'latitude'> | undefined =
      temporarySite !== null ? {...temporarySite.site} : undefined;
    setTemporarySite(null);
    navigate('CREATE_SITE', {
      mapCoords: siteToCreate,
    });
  }, [navigate, temporarySite, setTemporarySite]);

  const temporaryLearnMoreCallback = useCallback(() => {
    setTemporarySite(null);
    if (temporarySite) {
      navigate('LOCATION_DASHBOARD', {
        coords: temporarySite.site,
      });
    }
  }, [navigate, temporarySite, setTemporarySite]);

  const closeCallout = useCallback(() => {
    setSelectedSiteID(null);
    setTemporarySite(null);
  }, [setTemporarySite]);

  const onSitePress = useCallback(
    (event: OnPressEvent) => {
      setSelectedSiteID(event.features[0].id as string);
      setTemporarySite(null);
    },
    [setTemporarySite],
  );

  const onTempSitePress = useCallback(() => {
    showCallout();
  }, [showCallout]);

  const onLongPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (feature.geometry === null || feature.geometry.type !== 'Point') {
        console.error(
          'received long press with no feature geometry or non-Point geometry',
          feature.geometry,
        );
        return;
      }
      const [lon, lat] = feature.geometry.coordinates;
      setTemporarySite({
        site: {
          latitude: lat,
          longitude: lon,
        },
        showCallout: true,
      });
      setSelectedSiteID(null);
    },
    [setTemporarySite],
  );

  return (
    <Mapbox.MapView
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        flex: 1,
      }}
      onLongPress={onLongPress}
      scaleBarEnabled={false}>
      <Camera ref={ref} />
      <Mapbox.Images
        onImageMissing={console.debug}
        images={{
          sitePin: MapIcon.getImageSourceSync(
            'location-on',
            35,
            colors.secondary.main,
          ),
          temporarySitePin: MapIcon.getImageSourceSync(
            'location-on',
            35,
            colors.action.active,
          ),
        }}
      />
      <Mapbox.ShapeSource
        id="sitesSource"
        shape={sitesFeature}
        onPress={onSitePress}>
        <Mapbox.SymbolLayer id="sitesLayer" style={styles.siteLayer} />
      </Mapbox.ShapeSource>
      <Mapbox.ShapeSource
        id="temporarySitesSource"
        shape={temporarySitesFeature}
        onPress={onTempSitePress}>
        <Mapbox.SymbolLayer
          id="temporarySitesLayer"
          style={styles.temporarySiteLayer}
        />
      </Mapbox.ShapeSource>
      <UserLocation
        onUpdate={updateUserLocation}
        minDisplacement={USER_DISPLACEMENT_MIN_DISTANCE_M}
      />
      {selectedSite && (
        <SiteCallout site={selectedSite} closeCallout={closeCallout} />
      )}
      {temporarySite && temporarySite.showCallout && (
        <TemporarySiteCallout
          site={temporarySite.site}
          closeCallout={closeCallout}
          onCreate={temporaryCreateCallback}
          onLearnMore={temporaryLearnMoreCallback}
        />
      )}
    </Mapbox.MapView>
  );
};

const styles = {
  siteLayer: {
    iconAllowOverlap: true,
    iconAnchor: 'bottom',
    iconSize: 3.0,
    iconImage: 'sitePin',
  } satisfies Mapbox.SymbolLayerStyle,
  temporarySiteLayer: {
    iconAllowOverlap: true,
    iconAnchor: 'bottom',
    iconSize: 3.0,
    iconImage: 'temporarySitePin',
  } satisfies Mapbox.SymbolLayerStyle,
};

export default memo(forwardRef<CameraRef, SiteMapProps>(SiteMap));
