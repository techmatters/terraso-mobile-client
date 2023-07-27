import Mapbox, {Camera, Location, UserLocation} from '@rnmapbox/maps';
import {OnPressEvent} from '@rnmapbox/maps/src/types/OnPressEvent';
import {memo, useEffect, useMemo, useRef, useState, useCallback} from 'react';
// TODO: Is it better to import type?
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {Icon, IconButton} from '../common/Icons';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {Box, Heading, Text, Flex, Badge, Divider, Button} from 'native-base';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from '../../constants';
import {useSelector} from '../../model/store';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '../../screens/AppScaffold';
import {Pressable} from 'react-native';

type SiteMapProps = {
  center?: Position;
  updateUserLocation?: (location: Location) => void;
  sites: Record<string, Site>;
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
  const {t} = useTranslation();
  const navigation = useNavigation();
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onPress = useCallback(
    () => navigation.navigate('LOCATION_DASHBOARD', {siteId: site.id}),
    [site.id, navigation],
  );

  return (
    <Mapbox.MarkerView
      coordinate={[site.longitude, site.latitude]}
      anchor={{x: 0.5, y: 0}}
      allowOverlap={true}>
      <Box bg="grey.200" padding="4">
        <Flex direction="row" align="top" justify="space-between">
          <Pressable onPress={onPress}>
            <Heading size="lg">{site.name}</Heading>
          </Pressable>
          <IconButton
            name="close"
            onPress={closeCallout}
            _icon={{size: 'md'}}
          />
        </Flex>
        {project && <Heading size="md">{project.name}</Heading>}
        <Box height="4" />
        <Box>
          <Text>
            {t('site.last_updated', {
              date: 'dd-mm-yyyy',
            })}
          </Text>
          <Text>{t('site.progress', {progress: '??'})}</Text>
          <Flex direction="row">
            <Badge>{t('site.members', {members: 'x'})}</Badge>
          </Flex>
        </Box>
      </Box>
    </Mapbox.MarkerView>
  );
};

const CalloutDetail = ({label, value}: {label: string; value: string}) => {
  return (
    <Box>
      <Text bold>{label}:</Text>
      <Text>{value}</Text>
    </Box>
  );
};

type TemporarySiteCalloutProps = {
  site: Pick<Site, 'latitude' | 'longitude'>;
  closeCallout: () => void;
};
const TemporarySiteCallout = ({
  site,
  closeCallout,
}: TemporarySiteCalloutProps) => {
  const {t} = useTranslation();
  const {navigate} = useNavigation();

  const onCreate = useCallback(
    () => navigate('CREATE_SITE', {mapCoords: site}),
    [site, navigate],
  );

  return (
    <Mapbox.MarkerView
      coordinate={[site.longitude, site.latitude]}
      anchor={{x: 0.5, y: 0}}
      allowOverlap={true}>
      <Box backgroundColor="background.default" padding="4">
        <Flex direction="row" align="top" justify="space-between">
          <CalloutDetail label={t('site.soil_id_prediction')} value="???" />
          <IconButton name="close" onPress={closeCallout} />
        </Flex>
        <Divider />
        <CalloutDetail
          label={t('site.ecological_site_prediction')}
          value="???"
        />
        <Divider />
        <CalloutDetail label={t('site.annual_precip_avg')} value="???" />
        <Divider />
        <CalloutDetail label={t('site.elevation')} value="???" />
        <Divider />
        <Flex direction="row" justify="space-between">
          <Button onPress={onCreate}>{t('site.create')}</Button>
          <Button>{t('site.more_info')}</Button>
        </Flex>
      </Box>
    </Mapbox.MarkerView>
  );
};

const SiteMap = memo((props: SiteMapProps): JSX.Element => {
  const {center, updateUserLocation, sites} = props;
  const [temporarySite, setTemporarySite] = useState<Pick<
    Site,
    'latitude' | 'longitude'
  > | null>(null);
  const [selectedSiteID, setSelectedSiteID] = useState<string | null>(null);
  const selectedSite = selectedSiteID === null ? null : sites[selectedSiteID];
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
    () =>
      siteFeatureCollection(
        temporarySite === null ? [] : [{...temporarySite, id: 'temp'}],
      ),
    [temporarySite],
  );

  const closeCallout = useCallback(() => {
    setSelectedSiteID(null);
    setTemporarySite(null);
  }, []);

  const onSitePress = useCallback((event: OnPressEvent) => {
    setSelectedSiteID(event.features[0].id as string);
    setTemporarySite(null);
  }, []);

  const onLongPress = useCallback((feature: GeoJSON.Feature) => {
    if (feature.geometry === null || feature.geometry.type !== 'Point') {
      console.error(
        'received long press with no feature geometry or non-Point geometry',
        feature.geometry,
      );
      return;
    }
    const [lon, lat] = feature.geometry.coordinates;
    setTemporarySite({
      latitude: lat,
      longitude: lon,
    });
    setSelectedSiteID(null);
  }, []);

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
          <Icon name="location-on" />
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
        shape={temporarySitesFeature}>
        <Mapbox.SymbolLayer id="temporarySitesLayer" style={styles.siteLayer} />
      </Mapbox.ShapeSource>
      <UserLocation
        onUpdate={updateUserLocation}
        minDisplacement={USER_DISPLACEMENT_MIN_DISTANCE_M}
      />
      {selectedSite && (
        <SiteCallout site={selectedSite} closeCallout={closeCallout} />
      )}
      {temporarySite && (
        <TemporarySiteCallout
          site={temporarySite}
          closeCallout={closeCallout}
        />
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
