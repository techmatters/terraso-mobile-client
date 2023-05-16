import Mapbox, {
  Camera,
  type Location,
  MarkerView,
  UserLocation,
} from '@rnmapbox/maps';
import React, {useEffect, useRef, useState} from 'react';
import {type DisplaySite} from '../datatypes/sites';
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {IconButton, Icon, ZStack, Box, HStack, VStack} from 'native-base';
// TODO: This vector icons module appears to be missing types
import VIcon from 'react-native-vector-icons/MaterialIcons';
import MapToolbar from './MapToolbar';

export type SiteMapProps = {
  sites: DisplaySite[];
  center: Position;
};

export default function SiteMap({sites, center}: SiteMapProps): JSX.Element {
  const camera = useRef<Camera>(null);
  const [location, setLocation] = useState<Location>(null);

  useEffect(() => {
    if (camera && location) {
      camera.current?.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
      });
    }
  }, [center, location]);

  return (
    <Box
      style={{
        flex: 1,
      }}>
      <Mapbox.MapView
        style={{
          flex: 1,
        }}>
        <Camera ref={camera} />
        <UserLocation onUpdate={setLocation} />
        {sites.map(site => {
          return (
            <MarkerView coordinate={[site.lon, site.lat]} key={site.key}>
              <IconButton
                icon={<Icon as={VIcon} name="location-on" />}
                size="sm"
                _icon={{
                  color: 'secondary.main',
                }}
              />
            </MarkerView>
          );
        })}
      </Mapbox.MapView>
      <Box zIndex={2} position="absolute" right="3" top="3">
        <MapToolbar backgroundColor="white" />
      </Box>
    </Box>
  );
}
