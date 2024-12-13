/*
 * Copyright © 2023-2024 Technology Matters
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

import {renderHook} from '@testing-library/react-native';

import {useValueSet} from 'terraso-mobile-client/hooks/useValueSet';

const renderValueSetHook = () => {
  return renderHook(() => useValueSet());
};

describe('useValueSet', () => {
  test('has empty values initially', () => {
    const {result} = renderValueSetHook();

    expect(result.current.values).toEqual([]);
  });

  test('tracks added values', () => {
    const {result, rerender} = renderValueSetHook();
    result.current.add('a');
    result.current.add('b');
    result.current.add('c');

    rerender({});
    expect(result.current.values.sort()).toEqual(['a', 'b', 'c']);
  });

  test('tracks removed values', () => {
    const {result, rerender} = renderValueSetHook();
    result.current.add('a');
    result.current.add('b').remove();
    result.current.add('c');

    rerender({});
    expect(result.current.values.sort()).toEqual(['a', 'c']);
  });

  test('tracks unique values', () => {
    const {result, rerender} = renderValueSetHook();
    result.current.add('a');
    result.current.add('b');
    result.current.add('b').remove();
    result.current.add('c');
    result.current.add('c');

    rerender({});
    expect(result.current.values.sort()).toEqual(['a', 'b', 'c']);
  });
});
