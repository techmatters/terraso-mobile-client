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
import {CircleLayer, UserLocation} from '@rnmapbox/maps';

import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';
import {useUpdatedForegroundPermissions} from 'terraso-mobile-client/hooks/appPermissionsHooks';

const mapboxBlue = 'rgba(51, 181, 229, 100)';

const layerStyles = {
  pulse: {
    circleRadius: 15,
    circleColor: mapboxBlue,
    circleOpacity: 0.2,
    circlePitchAlignment: 'map' as const,
  },
  background: {
    circleRadius: 9,
    circleColor: '#fff',
    circlePitchAlignment: 'map' as const,
  },
  foreground: {
    circleRadius: 6,
    circleColor: mapboxBlue,
    circlePitchAlignment: 'map' as const,
  },
};

type CustomUserLocationProps = {
  onUserLocationPress: (event?: GeoJSON.GeoJsonProperties) => void;
};

export const CustomUserLocation = ({
  onUserLocationPress,
}: CustomUserLocationProps) => {
  const {permissions} = useUpdatedForegroundPermissions();

  const handleUserLocationPress = (event?: GeoJSON.GeoJsonProperties) => {
    onUserLocationPress(event);
  };

  return permissions?.granted ? (
    <UserLocation
      onPress={handleUserLocationPress}
      minDisplacement={USER_DISPLACEMENT_MIN_DISTANCE_M}>
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
    </UserLocation>
  ) : (
    <></>
  );
};
