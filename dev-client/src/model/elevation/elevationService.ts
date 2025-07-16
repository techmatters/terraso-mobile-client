/*
 * Copyright © 2024 Technology Matters
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

import {formatCoordinate} from 'terraso-mobile-client/util';

export const getElevation = async (
  lat: number,
  lng: number,
): Promise<number | undefined> => {
  // 1. TypeScript requires values passed to URLSearchParams strings,
  //    which is why we convert the floats to strings.
  const queryString = new URLSearchParams({
    longitude: formatCoordinate(lng),
    latitude: formatCoordinate(lat),
  });
  let elevation;

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation/?${queryString}`,
    );
    if (response.status !== 200) {
      elevation = undefined;
    } else {
      const result = await response.text();
      elevation = parseInt(JSON.parse(result).elevation[0], 10);
    }
  } catch (error) {
    console.error(error);
  }
  return elevation;
};
