/*
 * Copyright © 2023 Technology Matters
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

import {screen, fireEvent} from '@testing-library/react-native';
import {customRender as render} from '@testing/utils';
import {FlatList, Text} from 'native-base';
import {
  SelectFilter,
  TextInputFilter,
  useListFilter,
  ListFilterProvider,
  ListFilterModal,
} from 'terraso-mobile-client/components/common/ListFilter';
import {normalizeText, searchText} from 'terraso-mobile-client/util';

const activateTextInputFilter = (filterText: string) => {
  const input = screen.getByPlaceholderText('Search');

  fireEvent.changeText(input, filterText);
};

const openModal = () => {
  const filterIcon = screen.getByLabelText('Update list filters');
  fireEvent.press(filterIcon);
};

const changeSelectFilter = (selectPlaceholder: string, optionText: string) => {
  openModal();

  const select = screen.getByPlaceholderText(
    selectPlaceholder,
    // little NativeBase thing :)
    // it appears the select is implemented using a text input that is hidden
    {
      includeHiddenElements: true,
    },
  );
  fireEvent.press(select);
  const option = screen.getByText(optionText);
  fireEvent.press(option);
};

const activateSelectFilter = (
  selectPlaceholder: string,
  optionText: string,
) => {
  changeSelectFilter(selectPlaceholder, optionText);
  const applyButton = screen.getByText('Apply');
  fireEvent.press(applyButton);
};

const assertNull = (...indexes: number[]) => {
  indexes.forEach(i =>
    expect(screen.queryByText(sampleObjects[i].name)).toBeNull(),
  );
};

const assertNotNull = (...indexes: number[]) => {
  indexes.forEach(i =>
    expect(screen.queryByText(sampleObjects[i].name)).not.toBeNull(),
  );
};

type TestObject = {
  name: string;
  id: string;
  privacy: 'private' | 'public';
};

const sampleObjects: TestObject[] = [
  {name: 'Alice', id: '1', privacy: 'private'},
  {name: 'Bob', id: '2', privacy: 'private'},
  {name: 'Carlos', id: '3', privacy: 'public'},
  {name: 'Carla', id: '4', privacy: 'private'},
];

const SampleList = () => {
  const {filteredItems} = useListFilter<TestObject>();
  return (
    <FlatList
      testID="LIST"
      data={filteredItems}
      renderItem={({item}) => <Text>{item.name}</Text>}
    />
  );
};

const Test = ({items}: {items?: TestObject[]}) => {
  return (
    <>
      <ListFilterProvider
        items={items !== undefined ? items : sampleObjects}
        filters={{
          search: {
            kind: 'filter',
            f: searchText,
            preprocess: normalizeText,
            lookup: {key: 'name'},
            hide: true,
          },
          role: {
            kind: 'filter',
            f: (val: string) => (comp: string | undefined) => val === comp,
            lookup: {
              record: {
                '1': 'manager',
                '2': 'viewer',
                '3': 'viewer',
                '4': 'contributor',
              },
              key: 'id',
            },
          },
          privacy: {
            kind: 'filter',
            f: (val: string) => (comp: string | undefined) => val === comp,
            lookup: {key: 'privacy'},
          },
          sort: {
            kind: 'sorting',
            options: {
              nameRev: {
                key: 'name',
                order: 'descending',
              },
            },
          },
        }}>
        <ListFilterModal
          searchInput={
            <TextInputFilter
              placeholder="Search"
              label="Search"
              name="search"
            />
          }>
          <SelectFilter
            key="role"
            name="role"
            options={{
              manager: 'Manager',
              contributor: 'Contributor',
              viewer: 'Viewer',
            }}
            placeholder="Project role"
            label="Role"
          />
          <SelectFilter
            key="privacy"
            name="privacy"
            label="Privacy"
            placeholder="Privacy"
            options={{private: 'Private', public: 'Public'}}
          />
          <SelectFilter
            key="sort"
            name="sort"
            label="Sort"
            placeholder="Sort"
            options={{nameRev: 'Name (reverse alphabetical)'}}
          />
        </ListFilterModal>
        <SampleList />
      </ListFilterProvider>
    </>
  );
};

test("Filter removes items that don't match query", () => {
  render(<Test />);

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeEmptyElement();
  expect(second).not.toBeEmptyElement();

  activateTextInputFilter('Alice');

  assertNull(1, 2, 3);
  assertNotNull(0);
});

test('Updating select filter removes items that do not match', async () => {
  render(<Test />);

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();

  activateSelectFilter('Project role', 'Manager');

  assertNull(1, 2, 3);
  assertNotNull(0);
});

test('Updating text input and select filters works', () => {
  render(<Test />);

  activateSelectFilter('Project role', 'Viewer');
  activateTextInputFilter('Carl');

  assertNull(0, 1, 3);
  assertNotNull(2);
});

test('Updating select filters and then text input works', () => {
  render(<Test />);

  activateTextInputFilter('Carl');
  activateSelectFilter('Project role', 'Viewer');

  assertNull(0, 1, 3);
  assertNotNull(2);
});

test('Selecting input is persisted after apply', () => {
  render(<Test />);

  expect(
    screen.getByPlaceholderText('Project role', {
      // NativeBase
      includeHiddenElements: true,
    }),
  ).toHaveProp('value', undefined);

  activateSelectFilter('Project role', 'Contributor');
  // NOTE: seems accessibility state not set properly by NativeBase
  //  expect(screen.getByText('Contributor')).toHaveAccessibilityState({
  //    selected: true,
  //  });
  expect(
    screen.getByPlaceholderText('Project role', {
      // NativeBase
      includeHiddenElements: true,
    }),
  ).toHaveProp('value', 'Contributor');
});

test('Badge number updated when filter applied', () => {
  render(<Test />);
  expect(screen.queryByLabelText('Number of filters applied')).toBeNull();
  activateSelectFilter('Project role', 'Manager');
  const badge = screen.getByLabelText('Number of filters applied');
  expect(badge).toHaveTextContent('1');
  activateSelectFilter('Privacy', 'Public');
  expect(badge).toHaveTextContent('2');
  activateTextInputFilter('A');
  expect(badge).toHaveTextContent('2');
});

test('Filtered items update when props updated', () => {
  const {rerender} = render(<Test />);
  activateTextInputFilter('Al');
  assertNull(1, 2, 3);
  assertNotNull(0);
  const newItems: TestObject[] = [
    ...sampleObjects,
    {name: 'Alex', id: '5', privacy: 'public'},
  ];
  rerender(<Test items={newItems} />);
  assertNull(1, 2, 3);
  assertNotNull(0);
  expect(screen.queryByText('Alex')).not.toBeNull();
});

test('Sort items by reverse', () => {
  render(<Test />);
  activateSelectFilter('Sort', 'Name (reverse alphabetical)');
  const list = screen.queryByTestId('LIST');
  expect(list).not.toBeNull();
  expect(list).toHaveTextContent('CarlosCarlaBobAlice');
});
