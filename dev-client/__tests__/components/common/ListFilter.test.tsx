import {render, screen, fireEvent} from '@testing-library/react-native';
import {FlatList, NativeBaseProvider, Text} from 'native-base';
import ListFilter, {
  FilterConfig,
  ListFilterProps,
  OptionMapping,
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

const activateTextInputFilter = (filterText: string) => {
  const input = screen.getByPlaceholderText('Search');

  fireEvent.changeText(input, filterText);
};

const activateSelectFilter = (
  selectPlaceholder: string,
  optionText: string,
) => {
  const filterIcon = screen.getByText('Select filters');
  fireEvent.press(filterIcon);

  const select = screen.getByPlaceholderText(selectPlaceholder, {
    includeHiddenElements: true,
  });
  fireEvent.press(select);
  const managerBar = screen.getByText(optionText);
  fireEvent.press(managerBar);
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
};

const sampleObjects: TestObject[] = [
  {name: 'Alice', id: '1'},
  {name: 'Bob', id: '2'},
  {name: 'Carlos', id: '3'},
  {name: 'Carla', id: '4'},
];

const inset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

// TODO: Define a custom render method that takes care of wrapper code for us
const Test = <S extends OptionMapping<S>>(
  props: Omit<ListFilterProps<TestObject, S>, 'children'>,
) => {
  return (
    <NativeBaseProvider theme={theme} initialWindowMetrics={inset}>
      <ListFilter<TestObject, S> {...props}>
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
      filterConfig={{
        textInput: {
          key: 'name',
        },
      }}
      displayConfig={{
        textInput: {
          placeholder: 'Search',
          label: 'Filter objects',
        },
      }}
    />,
  );

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeEmptyElement();
  expect(second).not.toBeEmptyElement();

  activateTextInputFilter('Alice');

  assertNull(1, 2, 3);
  assertNotNull(0);
});

const SELECT_FILTER_CONF: FilterConfig<
  TestObject,
  {role: 'manager' | 'viewer' | 'contributor'}
> = {
  textInput: {key: 'name'},
  select: {
    role: {
      key: 'id',
      lookup: {
        '1': 'manager',
        '2': 'viewer',
        '3': 'viewer',
        '4': 'contributor',
      },
    },
  },
};
const SELECT_DISPLAY_CONF = {
  textInput: {
    placeholder: 'Search',
    label: 'string',
  },
  select: {
    role: {
      label: 'Role',
      placeholder: 'Project role',
      options: {
        manager: 'Manager',
        contributor: 'Contributor',
        viewer: 'Viewer',
      },
    },
  },
};

test('Updating select filter removes items that do not match', async () => {
  render(
    <Test<{role: 'manager' | 'viewer' | 'contributor'}>
      items={sampleObjects}
      filterConfig={SELECT_FILTER_CONF}
      displayConfig={SELECT_DISPLAY_CONF}
    />,
  );

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();

  activateSelectFilter('Project role', 'Manager');

  assertNull(1, 2, 3);
  assertNotNull(0);
});

test('Updating text input and select filters works', () => {
  render(
    <Test<{role: 'manager' | 'viewer' | 'contributor'}>
      items={sampleObjects}
      filterConfig={SELECT_FILTER_CONF}
      displayConfig={SELECT_DISPLAY_CONF}
    />,
  );

  activateSelectFilter('Project role', 'Viewer');
  activateTextInputFilter('Carl');

  assertNull(0, 1, 3);
  assertNotNull(2);
});

test('Updating select filters and then text input works', () => {
  render(
    <Test<{role: 'manager' | 'viewer' | 'contributor'}>
      items={sampleObjects}
      filterConfig={SELECT_FILTER_CONF}
      displayConfig={SELECT_DISPLAY_CONF}
    />,
  );

  activateTextInputFilter('Carl');
  activateSelectFilter('Project role', 'Viewer');

  assertNull(0, 1, 3);
  assertNotNull(2);
});
