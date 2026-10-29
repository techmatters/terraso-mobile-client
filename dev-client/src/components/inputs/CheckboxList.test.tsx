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

import {fireEvent, render, screen} from '@testing-library/react-native';

import {
  CheckboxList,
  MultiSelectProps,
} from 'terraso-mobile-client/components/inputs/CheckboxList';

type Fruit = {id: string; name: string};

const FRUITS: Fruit[] = [
  {id: 'apple', name: 'Apple'},
  {id: 'banana', name: 'Banana'},
  {id: 'cherry', name: 'Cherry'},
];

const renderList = (props: Partial<MultiSelectProps<Fruit>> = {}) => {
  const onValueChange = jest.fn();
  render(
    <CheckboxList
      label="Pick fruit"
      options={FRUITS}
      optionKey={fruit => fruit.id}
      renderValue={fruit => fruit.name}
      value={[]}
      onValueChange={onValueChange}
      {...props}
    />,
  );
  return {onValueChange};
};

const checkbox = (name: string) => screen.getByRole('checkbox', {name});

describe('CheckboxList', () => {
  test('renders the label and one checkbox per option', () => {
    renderList();

    expect(screen.getByText('Pick fruit')).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(FRUITS.length);
  });

  test('shows selected options as checked and the rest as unchecked', () => {
    renderList({value: [FRUITS[1]]});

    expect(checkbox('Banana')).toBeChecked();
    expect(checkbox('Apple')).not.toBeChecked();
    expect(checkbox('Cherry')).not.toBeChecked();
  });

  test('pressing an unchecked option adds it to the selection', () => {
    const {onValueChange} = renderList({value: [FRUITS[0]]});

    fireEvent.press(checkbox('Cherry'));

    expect(onValueChange).toHaveBeenCalledWith([FRUITS[0], FRUITS[2]]);
  });

  test('pressing a checked option removes it from the selection', () => {
    const {onValueChange} = renderList({value: [FRUITS[0], FRUITS[1]]});

    fireEvent.press(checkbox('Apple'));

    expect(onValueChange).toHaveBeenCalledWith([FRUITS[1]]);
  });

  test('keeps the selection in display order regardless of the order options were checked', () => {
    const {onValueChange} = renderList({value: [FRUITS[2]]});

    fireEvent.press(checkbox('Apple'));

    expect(onValueChange).toHaveBeenCalledWith([FRUITS[0], FRUITS[2]]);
  });

  test('matches selected options by key, not object identity', () => {
    renderList({value: [{id: 'banana', name: 'Banana'}]});

    expect(checkbox('Banana')).toBeChecked();
  });
});
