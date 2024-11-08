/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */
import {useMemo} from 'react';

import Mapbox, {CircleLayer} from '@rnmapbox/maps';

import {useSelector} from 'terraso-mobile-client/store';

const mapboxBlue = 'rgba(51, 181, 229, 100)';

const layerStyles = {
  pulse: {
    circleRadius: 15,
    circleColor: mapboxBlue,
    circleOpacity: 0.2,
    circlePitchAlignment: 'map',
  },
  background: {
    circleRadius: 9,
    circleColor: '#fff',
    circlePitchAlignment: 'map',
  },
  foreground: {
    circleRadius: 6,
    circleColor: mapboxBlue,
    circlePitchAlignment: 'map',
  },
};

type CustomUserLocationProps = {
  onUserLocationPress: (event?: GeoJSON.GeoJsonProperties) => void;
};

export const CustomUserLocation = ({
  onUserLocationPress,
}: CustomUserLocationProps) => {
  const handleUserLocationPress = (event?: GeoJSON.GeoJsonProperties) => {
    onUserLocationPress(event);
  };

  const userLocation = useSelector(state => state.map.userLocation);

  const feature = useMemo(() => {
    if (userLocation.coords === null) {
      return null;
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          userLocation.coords.longitude,
          userLocation.coords.latitude,
        ],
      },
    } as GeoJSON.Feature;
  }, [userLocation.coords]);

  return (
    feature && (
      <Mapbox.ShapeSource
        id="userLocationSource"
        shape={feature}
        onPress={handleUserLocationPress}>
        <CircleLayer
          key="mapboxUserLocationPulseCircle"
          id="mapboxUserLocationPulseCircle"
          belowLayerID="sitesLayer"
          style={layerStyles.pulse}
        />
        <CircleLayer
          key="mapboxUserLocationWhiteCircle"
          id="mapboxUserLocationWhiteCircle"
          belowLayerID="sitesLayer"
          style={layerStyles.background}
        />
        <CircleLayer
          key="mapboxUserLocationBlueCircle"
          id="mapboxUserLocationBlueCircle"
          aboveLayerID="mapboxUserLocationWhiteCircle"
          style={layerStyles.foreground}
        />
      </Mapbox.ShapeSource>
    )
  );
};
