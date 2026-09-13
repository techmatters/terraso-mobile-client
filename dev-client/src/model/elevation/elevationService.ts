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

import {fetchElevation} from 'terraso-client-shared/soilId/soilIdService';

const ELEVATION_FETCH_TIMEOUT_MS = 10000;

// Raw call — may throw. Callers should use getElevation, which wraps this with
// a timeout and swallows errors. Delegates to the backend soilId.elevation
// query (Mapbox Terrain-RGB) so the stored/displayed elevation matches the one
// the soil-ID ranking uses, instead of a separate provider that would diverge.
const requestElevationApi = async (
  latitude: number,
  longitude: number,
): Promise<number | null> => {
  return fetchElevation({latitude, longitude});
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
