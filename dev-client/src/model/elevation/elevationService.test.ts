/*
 * Copyright © 2026 Technology Matters
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

import {getElevation} from 'terraso-mobile-client/model/elevation/elevationService';

jest.mock('terraso-client-shared/elevation/elevationService');

const mockFetchElevation = fetchElevation as jest.MockedFunction<
  typeof fetchElevation
>;

describe('getElevation', () => {
  // Swallowed failures log at console.log (not warn/error) so Sentry's
  // captureConsole integration does not promote them to issues.
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('returns the fetched elevation on success', async () => {
    mockFetchElevation.mockResolvedValue(1234);
    await expect(getElevation(1, 2)).resolves.toBe(1234);
  });

  test('swallows UNAUTHENTICATED and returns null by default', async () => {
    mockFetchElevation.mockRejectedValue(UNAUTHENTICATED);
    await expect(getElevation(1, 2)).resolves.toBeNull();
    // Logged, but not at a level Sentry captures.
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('re-throws UNAUTHENTICATED when rethrowUnauthenticated is set', async () => {
    mockFetchElevation.mockRejectedValue(UNAUTHENTICATED);
    await expect(
      getElevation(1, 2, {rethrowUnauthenticated: true}),
    ).rejects.toBe(UNAUTHENTICATED);
    // The re-thrown case should not log at all — the retry wrapper handles it.
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('still swallows non-auth errors when rethrowUnauthenticated is set', async () => {
    mockFetchElevation.mockRejectedValue(new Error('network down'));
    await expect(
      getElevation(1, 2, {rethrowUnauthenticated: true}),
    ).resolves.toBeNull();
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
