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

import {
  getExperimentalRawColorEnabled,
  setExperimentalRawColorEnabled,
} from 'terraso-mobile-client/model/rawColor/experimentalRawColorToggle';

// In-memory stand-in for the MMKV-backed kvStorage so the flag logic is
// testable without the native module. (babel-jest hoists jest.mock above the
// imports above, so the toggle module picks up this mock.)
jest.mock('terraso-mobile-client/persistence/kvStorage', () => {
  const store: Record<string, boolean> = {};
  return {
    kvStorage: {
      getBool: (k: string) => store[k],
      setBool: (k: string, v: boolean) => {
        store[k] = v;
      },
    },
  };
});

describe('experimentalRawColorToggle', () => {
  test('defaults to false when unset', () => {
    expect(getExperimentalRawColorEnabled()).toBe(false);
  });

  test('round-trips the persisted value', () => {
    setExperimentalRawColorEnabled(true);
    expect(getExperimentalRawColorEnabled()).toBe(true);
    setExperimentalRawColorEnabled(false);
    expect(getExperimentalRawColorEnabled()).toBe(false);
  });
});
