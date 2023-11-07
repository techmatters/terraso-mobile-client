import '@testing-library/jest-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {FlatList, NativeBaseProvider, Text} from 'native-base';
import ListFilter, {
  ListFilterProps,
} from 'terraso-mobile-client/components/common/ListFilter';
import {theme} from 'terraso-mobile-client/theme';

// include this line for mocking react-native-gesture-handler
import 'react-native-gesture-handler/jestSetup';

// include this section and the NativeAnimatedHelper section for mocking react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};

  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@gorhom/bottom-sheet', () => 'BottomSheet');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => 'MaterialCommunityIcons',
);
//jest.mock('@react-navigation/elements/assets', () => 'Assets');

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

  expect(first).not.toBeEmptyElement();
  expect(second).toBeEmptyElement();
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
