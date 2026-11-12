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

import {fetchElevation} from 'terraso-mobile-client/model/elevation/elevationSlice';
import {resolveElevation} from 'terraso-mobile-client/screens/CreateSiteScreen/resolveElevation';
import type {AppDispatch} from 'terraso-mobile-client/store';

jest.mock('terraso-mobile-client/model/elevation/elevationSlice');
const mockFetchElevation = fetchElevation as jest.MockedFunction<
  typeof fetchElevation
>;

const SITE_PIN = {latitude: 45, longitude: -90};

// resolveElevation dispatches the fetchElevation thunk and unwraps it. Model the
// dispatch return as the RTK thunk promise (which carries .unwrap()): a resolved
// unwrap is a successful fetch (value may be null); a rejected unwrap is the
// refresh-failed / signed-out path, where resolveElevation falls back to null.
const dispatchResolving = (value: number | null) =>
  jest.fn().mockReturnValue({unwrap: () => Promise.resolve(value)});
const dispatchRejecting = () =>
  jest.fn().mockReturnValue({unwrap: () => Promise.reject('signed out')});
const asDispatch = (mock: jest.Mock) => mock as unknown as AppDispatch;

beforeEach(() => {
  mockFetchElevation.mockReset();
  // Tag the dispatched thunk with its coords arg so we can assert on it.
  mockFetchElevation.mockImplementation(
    coords => ({type: 'elevation/fetchElevation', coords}) as any,
  );
});

describe('resolveElevation', () => {
  describe('when coords are unchanged', () => {
    it('returns original elevation without fetching (offline)', async () => {
      const dispatch = dispatchResolving(999);
      await expect(
        resolveElevation(asDispatch(dispatch), SITE_PIN, SITE_PIN, 100, true),
      ).resolves.toBe(100);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('returns original elevation without fetching (online)', async () => {
      const dispatch = dispatchResolving(999);
      await expect(
        resolveElevation(asDispatch(dispatch), SITE_PIN, SITE_PIN, 100, false),
      ).resolves.toBe(100);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('returns null elevation without fetching', async () => {
      const dispatch = dispatchResolving(999);
      await expect(
        resolveElevation(asDispatch(dispatch), SITE_PIN, SITE_PIN, null, false),
      ).resolves.toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('when coords have changed and online', () => {
    const NEW_COORDS = {latitude: 46, longitude: -91};

    it('fetches elevation for new coords', async () => {
      const dispatch = dispatchResolving(200);
      await expect(
        resolveElevation(
          asDispatch(dispatch),
          SITE_PIN,
          NEW_COORDS,
          100,
          false,
        ),
      ).resolves.toBe(200);
      expect(mockFetchElevation).toHaveBeenCalledWith(NEW_COORDS);
      expect(dispatch).toHaveBeenCalled();
    });

    it('returns null when the fetch resolves null', async () => {
      const dispatch = dispatchResolving(null);
      await expect(
        resolveElevation(
          asDispatch(dispatch),
          SITE_PIN,
          NEW_COORDS,
          100,
          false,
        ),
      ).resolves.toBeNull();
    });

    it('returns null when the thunk rejects (refresh failed / signed out)', async () => {
      const dispatch = dispatchRejecting();
      await expect(
        resolveElevation(
          asDispatch(dispatch),
          SITE_PIN,
          NEW_COORDS,
          100,
          false,
        ),
      ).resolves.toBeNull();
    });
  });

  describe('when coords have changed and offline', () => {
    it('returns null without fetching', async () => {
      const dispatch = dispatchResolving(200);
      const newCoords = {latitude: 46, longitude: -91};
      await expect(
        resolveElevation(asDispatch(dispatch), SITE_PIN, newCoords, 100, true),
      ).resolves.toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('when no sitePin', () => {
    it('fetches elevation when online', async () => {
      const dispatch = dispatchResolving(150);
      await expect(
        resolveElevation(
          asDispatch(dispatch),
          undefined,
          SITE_PIN,
          null,
          false,
        ),
      ).resolves.toBe(150);
      expect(mockFetchElevation).toHaveBeenCalledWith(SITE_PIN);
    });

    it('returns null when offline', async () => {
      const dispatch = dispatchResolving(150);
      await expect(
        resolveElevation(asDispatch(dispatch), undefined, SITE_PIN, null, true),
      ).resolves.toBeNull();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
