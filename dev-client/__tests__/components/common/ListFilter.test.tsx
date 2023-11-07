import {render, screen, fireEvent} from '@testing-library/react-native';
import {FlatList, NativeBaseProvider, Text} from 'native-base';
import ListFilter, {
  ListFilterProps,
} from 'terraso-mobile-client/components/common/ListFilter';
import {theme} from 'terraso-mobile-client/theme';

/* TODO: set up a custom jest environment that runs that code
   before EVERY test
   see https://jestjs.io/docs/configuration#testenvironment-string*/
beforeEach(() => {
  // Install the in-memory adapter
  let mmkvMock = require('react-native-mmkv-storage/jest/dist/jest/memoryStore.js');
  mmkvMock.unmock(); // Cleanup if already mocked
  mmkvMock.mock(); // Mock the storage
});

type TestObject = {
  name: string;
  id: string;
};

const sampleObjects: TestObject[] = [
  {name: 'Passes filter', id: '1'},
  {name: 'Fails filter', id: '2'},
];

const inset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

const Test = (props: Omit<ListFilterProps<TestObject>, 'children'>) => {
  return (
    <NativeBaseProvider theme={theme} initialWindowMetrics={inset}>
      <ListFilter<TestObject> {...props}>
        {({filteredItems, InputFilter}) => (
          <>
            {InputFilter}
            <FlatList
              data={filteredItems}
              renderItem={({item}) => <Text>{item.name}</Text>}
            />
          </>
        )}
      </ListFilter>
    </NativeBaseProvider>
  );
};

test("Filter removes items that don't match query", () => {
  render(
    <Test
      items={sampleObjects}
      options={{
        inputFilter: {
          key: 'name',
          placeholder: 'Search',
        },
      }}
    />,
  );

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeEmptyElement();
  expect(second).not.toBeEmptyElement();

  const input = screen.getByPlaceholderText('Search');

  fireEvent.changeText(input, 'Passes');

  expect(screen.queryByText(sampleObjects[0].name)).not.toBeNull();
  expect(screen.queryByText(sampleObjects[1].name)).toBeNull();
});

test.skip('Updating select filter removes items that do not match', () => {
  const role = Symbol('role');

  render(
    <Test
      items={sampleObjects}
      options={{
        inputFilter: {key: 'name', placeholder: 'Search'},
        selectFilters: {
          [role]: {
            label: 'User Role',
            key: 'id',
            lookup: {'1': 'manager', '2': 'viewer'},
            choices: {
              manager: 'Manager',
              viewer: 'Viewer',
              contributor: 'Contributor',
            },
          },
        },
      }}
    />,
  );

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeEmptyElement();
  expect(second).not.toBeEmptyElement();

  const filterIcon = screen.getByLabelText('Select filters');
  fireEvent.press(filterIcon);

  const select = screen.getByRole('menu');
  fireEvent.press(select);
  const managerBar = screen.getByText('Manager');
  fireEvent.press(managerBar);
  const applyButton = screen.getByText('Apply');
  fireEvent.press(applyButton);

  expect(first).not.toBeEmptyElement();
  expect(second).toBeEmptyElement();
});
