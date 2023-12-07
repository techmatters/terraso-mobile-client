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

import Mapbox from '@rnmapbox/maps';
import {PixelRatio, Platform, StyleProp, ViewStyle} from 'react-native';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {Position} from '@rnmapbox/maps/lib/typescript/types/Position';
import {useMemo} from 'react';
import {COORDINATE_PRECISION} from 'terraso-mobile-client/constants';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MIN,
  LONGITUDE_MAX,
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
