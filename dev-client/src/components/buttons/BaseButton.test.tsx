/*
 * Copyright © 2021-2023 Technology Matters
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

import {styleForState} from 'terraso-mobile-client/components/buttons/BaseButton';

describe('styleForState', () => {
  const style = {
    default: 'default',
    disabled: 'disabled',
    pressed: 'pressed',
  };

  test('returns default style initially', () => {
    expect(styleForState(style, {})).toBe('default');
  });

  test('returns disabled style', () => {
    expect(styleForState(style, {disabled: true})).toBe('disabled');
  });

  test('returns pressed style', () => {
    expect(styleForState(style, {pressed: true})).toBe('pressed');
  });

  test('disabled takes precedence over pressed', () => {
    expect(styleForState(style, {disabled: true, pressed: true})).toBe(
      'disabled',
    );
  });

  test('returns default style when no disabled style exists', () => {
    expect(styleForState({default: 'default'}, {disabled: true})).toBe(
      'default',
    );
  });

  test('returns default style when no pressed style exists', () => {
    expect(styleForState({default: 'default'}, {pressed: true})).toBe(
      'default',
    );
  });
});
