import Mapbox, {Camera, MarkerView, UserLocation} from '@rnmapbox/maps';
import React, {memo, useEffect, useRef} from 'react';
// TODO: Is it better to import type?
import {type SiteDisplay} from '../../types';
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import MaterialIconButton from '../common/MaterialIconButton';

type SiteMapProps = {
  sites: SiteDisplay[];
  center?: Position;
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
        <MaterialIconButton
          name="location-on"
          iconButtonProps={{size: 'sm'}}
          iconProps={{color: 'secondary.main'}}
        />
      </MarkerView>
    );
  });

  return (
    <Mapbox.MapView
      // eslint-disable-next-line react-native/no-inline-styles
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
