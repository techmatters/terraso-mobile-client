import Mapbox from '@rnmapbox/maps';
import {StyleProp, ViewStyle} from 'react-native';
import {Icon} from './Icons';

const defaultAnchor = {x: 0.5, y: 0};

type Props = {
  coords: {latitude: number; longitude: number};
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
  const position = [coords.longitude, coords.latitude];
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
      />
      {displayCenterMarker && (
        <Mapbox.MarkerView coordinate={position} anchor={defaultAnchor}>
          <Icon name="location-on" color="secondary.main" />
        </Mapbox.MarkerView>
      )}
    </Mapbox.MapView>
  );
};
