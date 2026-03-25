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

import {fetchElevationForCoords} from 'terraso-mobile-client/model/elevation/elevationService';
import {resolveElevation} from 'terraso-mobile-client/screens/CreateSiteScreen/resolveElevation';

jest.mock('terraso-mobile-client/model/elevation/elevationService');
const mockFetchElevation = fetchElevationForCoords as jest.MockedFunction<
  typeof fetchElevationForCoords
>;

const SITE_PIN = {latitude: 45, longitude: -90};

beforeEach(() => {
  mockFetchElevation.mockReset();
});

describe('resolveElevation', () => {
  describe('when coords are unchanged', () => {
    it('returns original elevation without fetching (offline)', async () => {
      await expect(
        resolveElevation(SITE_PIN, SITE_PIN, 100, true),
      ).resolves.toBe(100);
      expect(mockFetchElevation).not.toHaveBeenCalled();
    });

    it('returns original elevation without fetching (online)', async () => {
      await expect(
        resolveElevation(SITE_PIN, SITE_PIN, 100, false),
      ).resolves.toBe(100);
      expect(mockFetchElevation).not.toHaveBeenCalled();
    });

    it('returns undefined elevation without fetching', async () => {
      await expect(
        resolveElevation(SITE_PIN, SITE_PIN, undefined, false),
      ).resolves.toBeUndefined();
      expect(mockFetchElevation).not.toHaveBeenCalled();
    });
  });

  describe('when coords have changed and online', () => {
    const NEW_COORDS = {latitude: 46, longitude: -91};

    it('fetches elevation for new coords', async () => {
      mockFetchElevation.mockResolvedValue(200);
      await expect(
        resolveElevation(SITE_PIN, NEW_COORDS, 100, false),
      ).resolves.toBe(200);
      expect(mockFetchElevation).toHaveBeenCalledWith(
        NEW_COORDS.latitude,
        NEW_COORDS.longitude,
      );
    });

    it('returns undefined when fetch returns undefined', async () => {
      mockFetchElevation.mockResolvedValue(undefined);
      await expect(
        resolveElevation(SITE_PIN, NEW_COORDS, 100, false),
      ).resolves.toBeUndefined();
    });
  });

  describe('when coords have changed and offline', () => {
    it('returns undefined without fetching', async () => {
      const newCoords = {latitude: 46, longitude: -91};
      await expect(
        resolveElevation(SITE_PIN, newCoords, 100, true),
      ).resolves.toBeUndefined();
      expect(mockFetchElevation).not.toHaveBeenCalled();
    });
  });

  describe('when no sitePin', () => {
    it('fetches elevation when online', async () => {
      mockFetchElevation.mockResolvedValue(150);
      await expect(
        resolveElevation(undefined, SITE_PIN, undefined, false),
      ).resolves.toBe(150);
      expect(mockFetchElevation).toHaveBeenCalledWith(
        SITE_PIN.latitude,
        SITE_PIN.longitude,
      );
    });

    it('returns undefined when offline', async () => {
      await expect(
        resolveElevation(undefined, SITE_PIN, undefined, true),
      ).resolves.toBeUndefined();
      expect(mockFetchElevation).not.toHaveBeenCalled();
    });
  });
});
