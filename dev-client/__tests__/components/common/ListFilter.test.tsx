import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import {FlatList, NativeBaseProvider, Text} from 'native-base';
import ListFilter, {
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
      filterOptions={{
        inputFilter: {
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

  const input = screen.getByPlaceholderText('Search');

  fireEvent.changeText(input, 'Passes');

  expect(screen.queryByText(sampleObjects[0].name)).not.toBeNull();
  expect(screen.queryByText(sampleObjects[1].name)).toBeNull();
});

test('Updating select filter removes items that do not match', async () => {
  render(
    <Test
      items={sampleObjects}
      filterOptions={{
        inputFilter: {key: 'name'},
        selectFilters: {
          role: {
            key: 'id',
            lookup: {'1': 'manager', '2': 'viewer'},
          },
        },
      }}
      displayConfig={{
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
      }}
    />,
  );

  const first = screen.getByText(sampleObjects[0].name);
  const second = screen.getByText(sampleObjects[1].name);

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();

  activateSelectFilter('Project role', 'Manager');

  expect(screen.queryByText(sampleObjects[0].name)).not.toBeNull();
  expect(screen.queryByText(sampleObjects[1].name)).toBeNull();
});
