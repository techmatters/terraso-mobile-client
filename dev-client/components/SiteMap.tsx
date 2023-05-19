import Mapbox, {Camera, MarkerView, UserLocation} from '@rnmapbox/maps';
import React, {memo, useEffect, useRef} from 'react';
import {type DisplaySite} from '../datatypes/sites';
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {IconButton, Icon} from 'native-base';
// TODO: This vector icons module appears to be missing types
import VIcon from 'react-native-vector-icons/MaterialIcons';

type SiteMapProps = {
  sites: DisplaySite[];
  center: Position;
};

const SiteMap = memo(({sites, center}: SiteMapProps): JSX.Element => {
  const camera = useRef<Camera>(null);

  useEffect(() => {
    camera.current?.setCamera({
      centerCoordinate: center,
    });
  }, [center]);

  let markers = sites.map(site => {
    return (
      <MarkerView
        coordinate={[site.lon, site.lat]}
        key={[site.lon, site.lat, site.name].join('-')}
        allowOverlap={true}>
        <IconButton
          icon={<Icon as={VIcon} name="location-on" />}
          size="sm"
          _icon={{
            color: 'secondary.main',
          }}></IconButton>
      </MarkerView>
    );
  });

  return (
    <Mapbox.MapView
      style={{
        flex: 1,
      }}>
      <Camera ref={camera} centerCoordinate={[0, 0]} />
      <UserLocation />
      {markers}
    </Mapbox.MapView>
  );
});

export default SiteMap;
