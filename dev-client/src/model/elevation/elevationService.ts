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

const ELEVATION_FETCH_TIMEOUT_MS = 10000;

// Raw HTTP call — may throw. Callers should use getElevation, which wraps
// this with a timeout and swallows errors.
const requestElevationApi = async (
  latitude: number,
  longitude: number,
): Promise<number | null> => {
  const queryString = new URLSearchParams({
    longitude: formatCoordinateInEnglish(longitude),
    latitude: formatCoordinateInEnglish(latitude),
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/elevation/?${queryString}`,
  );
  if (response.status !== 200) {
    return null;
  }
  const result = await response.json();
  return parseInt(result.elevation[0], 10);
};

/**
 * Fetch elevation for coordinates.
 * Returns undefined if the request fails or times out (never throws).
 */
export const getElevation = async (
  latitude: number,
  longitude: number,
): Promise<number | null> => {
  const timeoutReturn = 'timeout';
  const timeoutPromise = new Promise<typeof timeoutReturn>(resolve =>
    setTimeout(() => resolve(timeoutReturn), ELEVATION_FETCH_TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([
      requestElevationApi(latitude, longitude),
      timeoutPromise,
    ]);
    if (result === timeoutReturn) {
      console.warn(`Elevation timed out for (${latitude}, ${longitude})`);
      return null;
    }
    return result;
  } catch (error) {
    console.warn(`Elevation errored for (${latitude}, ${longitude}): `, error);
    return null;
  }
};
