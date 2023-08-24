import Mapbox from '@rnmapbox/maps';
import {StyleProp, ViewStyle} from 'react-native';
import {Icon} from './Icons';
import {Coords} from '../../model/map/mapSlice';
import {Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {useMemo} from 'react';

const defaultAnchor = {x: 0.5, y: 0};

type Props = {
  coords: Coords;
  zoomLevel?: number;
  style?: StyleProp<ViewStyle>;
  displayCenterMarker?: boolean;
};

export const coordsToPosition = ({latitude, longitude}: Coords): Position => [
  longitude,
  latitude,
];
export const positionToCoords = ([longitude, latitude]: Position): Coords => ({
  latitude,
  longitude,
});

export const StaticMapView = ({
  coords,
  zoomLevel = 15,
  style,
  displayCenterMarker,
}: Props) => {
  const position = useMemo(() => coordsToPosition(coords), [coords]);
  return (
    <Mapbox.MapView
      style={style}
      styleURL={Mapbox.StyleURL.Satellite}
      scaleBarEnabled={false}
      logoEnabled={false}
      zoomEnabled={false}
      scrollEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      attributionEnabled={false}>
      <Mapbox.Camera
        centerCoordinate={position}
        zoomLevel={zoomLevel}
        animationMode="none"
        animationDuration={0}
      />
      {displayCenterMarker && (
        <Mapbox.MarkerView coordinate={position} anchor={defaultAnchor}>
          <Icon name="location-on" color="secondary.main" />
        </Mapbox.MarkerView>
      )}
    </Mapbox.MapView>
  );
};
