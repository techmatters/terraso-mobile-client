import '@testing-library/jest-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {FlatList, NativeBaseProvider, Text} from 'native-base';
import ListFilter, {
  SearchConfigOptions,
  useListFilter,
} from 'terraso-mobile-client/components/common/ListFilter';
import {theme} from 'terraso-mobile-client/theme';
import {useEffect} from 'react';

const sampleObjects = [
  {name: 'Passes filter', id: '1'},
  {name: 'Fails filter', id: '2'},
];

const inset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

type TestProps = {
  mock: jest.Mock<any, any, any>;
  searchConfig: SearchConfigOptions<(typeof sampleObjects)[number]>;
};

const Test = ({mock, searchConfig}: TestProps) => {
  const {filteredItems, query, onChangeText} = useListFilter(
    searchConfig,
    sampleObjects,
  );

  useEffect(() => {
    mock(filteredItems);
  }, [filteredItems, mock]);

  return (
    <NativeBaseProvider theme={theme} initialWindowMetrics={inset}>
      <ListFilter<(typeof sampleObjects)[number]>
        query={query}
        onChangeText={onChangeText}
        placeholder="Search"
      />
    </NativeBaseProvider>
  );
};

test("Filter removes items that don't match query", () => {
  const mock = jest.fn();

  render(
    <Test
      mock={mock}
      searchConfig={{
        search: {key: 'name'},
      }}
    />,
  );

  const input = screen.getByPlaceholderText('Search');

  fireEvent.changeText(input, 'Passes');
  expect(mock).toHaveBeenCalledWith([sampleObjects[0]]);
});

test('Updating select filter removes items that do not match', () => {
  const mock = jest.fn();

  const role = Symbol('role');

  render(
    <Test
      mock={mock}
      searchConfig={{
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
      }}>
      {({filteredItems, InputFilter}) => (
        <>
          <InputFilter />
          <FlatList
            data={filteredItems}
            renderItem={item => <Text testID={item.id}>{item.name}</Text>}
          />
        </>
      )}
    </Test>,
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
