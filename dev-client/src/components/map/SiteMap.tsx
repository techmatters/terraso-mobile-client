import Mapbox, {Camera, MarkerView, UserLocation} from '@rnmapbox/maps';
import React, {memo, useEffect, useRef, useState} from 'react';
// TODO: Is it better to import type?
import {type Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import MaterialIconButton from '../common/MaterialIconButton';
import {v4 as uuidv4} from 'uuid';

export type SiteMarker = {
  id: string;
  coordinates: GeoJSON.Position;
  popup?: JSX.Element;
};

type SiteMapProps = {
  sites: SiteMarker[];
  center?: Position;
};

const SiteMap = memo(({sites, center}: SiteMapProps): JSX.Element => {
  const [temporarySites, setTemporarySites] = useState<SiteMarker[]>([]);
  const camera = useRef<Camera>(null);

  useEffect(() => {
    camera.current?.setCamera({
      centerCoordinate: center,
    });
  }, [center]);

  let markers = sites.concat(temporarySites).map(site => {
    return (
      <MarkerView
        coordinate={site.coordinates}
        key={site.id}
        allowOverlap={true}>
        <MaterialIconButton
          name="location-on"
          iconButtonProps={{size: 'sm'}}
          iconProps={{color: 'secondary.main'}}
        />
      </MarkerView>
    );
  });

  const onLongPress = (feature: GeoJSON.Feature) => {
    if (feature.geometry === null || feature.geometry.type !== 'Point') {
      console.error(
        'received long press with no feature geometry or non-Point geometry',
        feature.geometry,
      );
      return;
    }
    const siteMarker: SiteMarker = {
      id: uuidv4(),
      coordinates: feature.geometry.coordinates,
    };
    setTemporarySites([...temporarySites, siteMarker]);
  };

  return (
    <Mapbox.MapView
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        flex: 1,
      }}
      onLongPress={onLongPress}>
      <Camera ref={camera} centerCoordinate={[0, 0]} />
      <UserLocation />
      {markers}
    </Mapbox.MapView>
  );
});

export default SiteMap;
