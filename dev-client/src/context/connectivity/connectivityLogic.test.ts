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

import {getIsOffline} from 'terraso-mobile-client/context/connectivity/connectivityLogic';

describe('isOffline', () => {
  test('returns false if connected and reachable', () => {
    expect(
      getIsOffline({isConnected: true, isInternetReachable: true}),
    ).toEqual(false);
  });

  test('returns true if connected and internet not reachable', () => {
    expect(
      getIsOffline({isConnected: true, isInternetReachable: false}),
    ).toEqual(true);
  });

  test('returns true if not connected', () => {
    expect(
      getIsOffline({isConnected: false, isInternetReachable: null}),
    ).toEqual(true);
  });

  test('returns null if connected is null (unknown yet)', () => {
    expect(
      getIsOffline({isConnected: null, isInternetReachable: false}),
    ).toEqual(null);
  });

  test('returns null if connected but reachable is null (unknown yet)', () => {
    expect(
      getIsOffline({isConnected: true, isInternetReachable: null}),
    ).toEqual(null);
  });
});
