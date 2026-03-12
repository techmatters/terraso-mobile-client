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

import {formatCoordinateInEnglish} from 'terraso-mobile-client/util';

export const getElevation = async (
  lat: number,
  lng: number,
): Promise<number | undefined> => {
  // TypeScript requires values passed to URLSearchParams to be strings,
  // which is why we convert the floats to strings.
  const queryString = new URLSearchParams({
    longitude: formatCoordinateInEnglish(lng),
    latitude: formatCoordinateInEnglish(lat),
  });
  let elevation;

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation/?${queryString}`,
    );
    if (response.status === 200) {
      const result = await response.json();
      elevation = parseInt(result.elevation[0], 10);
    }
  } catch (error) {
    console.error(error);
  }
  return elevation;
};

const ELEVATION_FETCH_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fetch elevation for coordinates. For use outside React components.
 * Returns null if fetch fails or times out (non-blocking).
 */
export const fetchElevationForCoords = async (
  latitude: number,
  longitude: number,
): Promise<number | null> => {
  try {
    const elevationPromise = getElevation(latitude, longitude);
    const timeoutReturn = 'timeout';
    const timeoutPromise = new Promise<typeof timeoutReturn>(resolve =>
      setTimeout(() => resolve(timeoutReturn), ELEVATION_FETCH_TIMEOUT_MS),
    );

    const result = await Promise.race([elevationPromise, timeoutPromise]);
    if (result === timeoutReturn) {
      console.warn(`Elevation timed out for (${latitude}, ${longitude})`);
      return null;
    }
    return result ?? null;
  } catch (error) {
    console.warn(`Elevation errored for (${latitude}, ${longitude}): `, error);
    return null;
  }
};
