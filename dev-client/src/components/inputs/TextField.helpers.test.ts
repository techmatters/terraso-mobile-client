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
  shouldShowError,
  TYPE_PRESETS,
} from 'terraso-mobile-client/components/inputs/TextField.helpers';

describe('shouldShowError', () => {
  test('returns false when there is no error', () => {
    expect(shouldShowError(undefined, true, 5)).toBe(false);
    expect(shouldShowError('', true, 5)).toBe(false);
  });

  test('hides error until touched or submit', () => {
    expect(shouldShowError('Required', false, 0)).toBe(false);
    expect(shouldShowError('Required', true, 0)).toBe(true);
    expect(shouldShowError('Required', false, 1)).toBe(true);
  });
});

describe('TYPE_PRESETS', () => {
  test('text preset uses default keyboard and sentences capitalization', () => {
    expect(TYPE_PRESETS.text).toEqual({
      keyboardType: 'default',
      autoCapitalize: 'sentences',
    });
  });

  test('email preset bundles email keyboard, no capitalize, autoComplete=email', () => {
    expect(TYPE_PRESETS.email).toEqual({
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      autoComplete: 'email',
    });
  });

  test('numeric preset uses numeric keyboard, no capitalize', () => {
    expect(TYPE_PRESETS.numeric).toEqual({
      keyboardType: 'numeric',
      autoCapitalize: 'none',
    });
  });
});
