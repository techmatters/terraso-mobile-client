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
 * Resolves to null on any failure or timeout, EXCEPT UNAUTHENTICATED, which is
 * always re-thrown. Every caller must therefore run inside the shared auth-retry
 * thunk (terraso-client-shared/store/utils) — directly (elevationSlice), via an
 * enclosing thunk (sync/pushUserData), or by dispatching one (resolveElevation)
 * — so the 401 refreshes the access token and retries instead of surfacing as an
 * unhandled rejection. All other failures stay swallowed.
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
    if (error === UNAUTHENTICATED) {
      // Let the enclosing auth-retry thunk wrapper refresh the token and retry.
      throw error;
    }
    // console.log, not console.warn — see the timeout branch above.
    console.log(`Elevation errored for (${latitude}, ${longitude}): `, error);
    return null;
  }
};
