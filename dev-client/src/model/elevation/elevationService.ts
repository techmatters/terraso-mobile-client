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

import {UNAUTHENTICATED} from 'terraso-client-shared/account/authConstants';
import {fetchElevation} from 'terraso-client-shared/elevation/elevationService';

const ELEVATION_FETCH_TIMEOUT_MS = 10000;

type GetElevationOptions = {
  /**
   * When true, re-throw UNAUTHENTICATED errors instead of swallowing them. This
   * lets a caller wrapped in the shared auth-retry thunk
   * (terraso-client-shared/store/utils) refresh the access token and retry the
   * request. All other failures (timeout, network, backend errors) are still
   * swallowed and resolve to null. Defaults to false so the non-Redux callers
   * (sync, resolveElevation) keep the never-throws contract.
   */
  rethrowUnauthenticated?: boolean;
};

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
 * Returns null if the request fails or times out. Never throws, except that
 * UNAUTHENTICATED is re-thrown when `rethrowUnauthenticated` is set (see the
 * option docs above).
 */
export const getElevation = async (
  latitude: number,
  longitude: number,
  {rethrowUnauthenticated = false}: GetElevationOptions = {},
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
      // console.log, not console.warn: elevation is non-critical and degrades to
      // null (and the sync path retries later), so these failures are not
      // actionable client-side bugs. Sentry's captureConsole only grabs
      // warn/error, so logging at this level keeps local visibility without
      // paging us for a harmless, expected outcome.
      console.log(`Elevation timed out for (${latitude}, ${longitude})`);
      return null;
    }
    return result;
  } catch (error) {
    if (rethrowUnauthenticated && error === UNAUTHENTICATED) {
      // Let the auth-retry thunk wrapper refresh the token and retry.
      throw error;
    }
    // console.log, not console.warn — see the timeout branch above.
    console.log(`Elevation errored for (${latitude}, ${longitude}): `, error);
    return null;
  }
};
