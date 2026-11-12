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

import {Coords} from 'terraso-client-shared/types';

import {fetchElevation} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {AppDispatch} from 'terraso-mobile-client/store';

export const resolveElevation = async (
  dispatch: AppDispatch,
  sitePin: Coords | undefined,
  submittedCoords: Coords,
  sitePinElevation: number | null,
  isOffline: boolean,
): Promise<number | null> => {
  const latLongWasChanged =
    submittedCoords.latitude !== sitePin?.latitude ||
    submittedCoords.longitude !== sitePin?.longitude;
  if (!latLongWasChanged) return sitePinElevation;
  if (isOffline) return null;
  // Dispatch through the shared auth-retry thunk rather than calling getElevation
  // directly: an expired access token is refreshed and the fetch retried (so the
  // new site gets its real elevation at creation time instead of a deferred-sync
  // backfill), and a dead refresh token signs out — consistent with every other
  // data fetch. The thunk rejects only when the refresh itself fails (user now
  // signed out); fall back to null and let a later sync backfill.
  try {
    return await dispatch(fetchElevation(submittedCoords)).unwrap();
  } catch {
    return null;
  }
};
