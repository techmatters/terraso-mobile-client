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
import {StyleProp, ViewStyle} from 'react-native';

import Mapbox from '@rnmapbox/maps';
import {Position} from '@rnmapbox/maps/lib/typescript/src/types/Position';

import {Coords} from 'terraso-client-shared/types';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from 'terraso-mobile-client/constants';

const coordsRegex = /^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/;
export type CoordsParseErrorReason =
  | 'COORDS_PARSE'
  | 'LATITUDE_PARSE'
  | 'LONGITUDE_PARSE'
  | 'LATITUDE_MIN'
  | 'LATITUDE_MAX'
  | 'LONGITUDE_MIN'
  | 'LONGITUDE_MAX';

export class CoordsParseError extends Error {
  constructor(reason: CoordsParseErrorReason) {
    super(reason);
  }
}

export interface CoordsParseError {
  message: CoordsParseErrorReason;
}

export const parseCoords = (coords: string) => {
  const match = coords.trim().match(coordsRegex);
  if (!match) {
    throw new CoordsParseError('COORDS_PARSE');
  }

  const [latitude, longitude] = [match[1], match[2]].map(Number.parseFloat);
  if (Number.isNaN(latitude)) {
    throw new CoordsParseError('LATITUDE_PARSE');
  } else if (Number.isNaN(longitude)) {
    throw new CoordsParseError('LONGITUDE_PARSE');
  } else if (latitude < LATITUDE_MIN) {
    throw new CoordsParseError('LATITUDE_MIN');
  } else if (latitude > LATITUDE_MAX) {
    throw new CoordsParseError('LATITUDE_MAX');
  } else if (longitude < LONGITUDE_MIN) {
    throw new CoordsParseError('LONGITUDE_MIN');
  } else if (longitude > LONGITUDE_MAX) {
    throw new CoordsParseError('LONGITUDE_MAX');
  } else {
    return {latitude, longitude};
  }
};

export const coordsToPosition = ({latitude, longitude}: Coords): Position => [
  longitude,
  latitude,
];
export const positionToCoords = ([longitude, latitude]: Position): Coords => ({
  latitude,
  longitude,
});

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
  const cameraSettings = useMemo(
    () =>
      ({
        centerCoordinate: coordsToPosition(coords),
        zoomLevel: zoomLevel,
        animationMode: 'none',
        animationDuration: 0,
      }) as const,
    [coords, zoomLevel],
  );

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
      <Mapbox.Camera defaultSettings={cameraSettings} />
      {displayCenterMarker && (
        <Mapbox.MarkerView
          coordinate={cameraSettings.centerCoordinate}
          anchor={defaultAnchor}>
          <Icon name="location-on" color="secondary.main" />
        </Mapbox.MarkerView>
      )}
    </Mapbox.MapView>
  );
};
