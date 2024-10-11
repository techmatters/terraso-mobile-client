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

import {CameraRef} from '@rnmapbox/maps/lib/typescript/src/components/Camera';

export const repositionCamera = ({
  feature,
  zoomLevel,
  animationDuration,
  paddingBottom,
  cameraRef,
}: {
  feature: GeoJSON.Feature;
  zoomLevel: number;
  animationDuration: number;
  paddingBottom: number;
  cameraRef?: React.RefObject<CameraRef>;
}) => {
  if (!feature.geometry || feature.geometry.type !== 'Point') {
    console.error(
      'Feature has no geometry or non-Point geometry',
      feature.geometry,
    );
    return;
  }
  const padding = {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: paddingBottom,
  };

  cameraRef?.current?.setCamera({
    zoomLevel,
    centerCoordinate: feature.geometry.coordinates,
    animationDuration,
    animationMode: 'easeTo',
    padding,
  });
};
