import Mapbox, {Camera, MarkerView, UserLocation} from '@rnmapbox/maps';
import React, {useEffect, useRef} from 'react';
import {type DisplaySite} from '../datatypes/sites';
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {PermissionsAndroid} from 'react-native';
import {IconButton, Icon} from 'native-base';
// TODO: This vector icons module appears to be missing types
import VIcon from 'react-native-vector-icons/MaterialIcons';

type SiteMapProps = {
  sites: DisplaySite[];
  center: Position;
};

// REVIEW: This is a bad name, any suggestions?
export default function SiteMap({sites, center}: SiteMapProps): JSX.Element {
  const camera = useRef<Camera>(null);

  useEffect(() => {
    camera.current?.setCamera({
      centerCoordinate: center,
    });
  }, [center]);

  return (
    <Mapbox.MapView
      style={{
        flex: 1,
      }}>
      <Camera ref={camera} />
      <UserLocation />
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
  );
}
