import Mapbox from '@rnmapbox/maps';
import {PixelRatio, Platform, StyleProp, ViewStyle} from 'react-native';
import {Icon} from './Icons';
import {Coords} from '../../model/map/mapSlice';
import {Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {useMemo} from 'react';
import {COORDINATE_PRECISION} from '../../constants';

export const coordToString = (coord: number) =>
  coord.toFixed(COORDINATE_PRECISION);
export const coordsToString = ({latitude, longitude}: Coords): string =>
  `${coordToString(latitude)},${coordToString(longitude)}`;

export const coordsToPosition = ({latitude, longitude}: Coords): Position => [
  longitude,
  latitude,
];
export const positionToCoords = ([longitude, latitude]: Position): Coords => ({
  latitude,
  longitude,
});

export const mapIconSizeForPlatform = (size: number) =>
  Math.round(size * Platform.select({android: PixelRatio.get(), default: 1}));

const defaultAnchor = {x: 0.5, y: 0};

type Props = {
  coords: Coords;
  zoomLevel?: number;
  style?: StyleProp<ViewStyle>;
  displayCenterMarker?: boolean;
};

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
