import {screen, fireEvent} from '@testing-library/react-native';
import {customRender as render} from '@testing/utils';
import {FlatList, Text} from 'native-base';
import ListFilter, {
  FilterConfig,
  ListFilterProps,
  OptionMapping,
} from 'terraso-mobile-client/components/common/ListFilter';

const activateTextInputFilter = (filterText: string) => {
  const input = screen.getByPlaceholderText('Search');

  fireEvent.changeText(input, filterText);
};

const openModal = () => {
  const filterIcon = screen.getByLabelText('Update list filters');
  fireEvent.press(filterIcon);
};

const activateSelectFilter = (
  selectPlaceholder: string,
  optionText: string,
) => {
  openModal();

  const select = screen.getByPlaceholderText(
    selectPlaceholder,
    // little NativeBase thing :)
    {
      includeHiddenElements: true,
    },
  );
  fireEvent.press(select);
  const option = screen.getByText(optionText);
  fireEvent.press(option);
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

const inset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

// TODO: Define a custom render method that takes care of wrapper code for us
const Test = <S extends OptionMapping<S>>(
  props: Omit<ListFilterProps<TestObject, S>, 'children'>,
) => {
  return (
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
  {role: 'manager' | 'viewer' | 'contributor'; privacy: 'private' | 'public'}
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
    privacy: {
      key: 'privacy',
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
    privacy: {
      label: 'Privacy',
      placeholder: 'Privacy',
      options: {
        private: 'Private',
        public: 'Public',
      },
    },
  },
};

test('Updating select filter removes items that do not match', async () => {
  render(
    <Test
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
    <Test
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
    <Test
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

test('Selecting input is persisted after apply', () => {
  render(
    <Test
      items={sampleObjects}
      filterConfig={SELECT_FILTER_CONF}
      displayConfig={SELECT_DISPLAY_CONF}
    />,
  );

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
  render(
    <Test
      items={sampleObjects}
      filterConfig={SELECT_FILTER_CONF}
      displayConfig={SELECT_DISPLAY_CONF}
    />,
  );
  expect(screen.queryByLabelText('Number of filters applied')).toBeNull();
  activateSelectFilter('Project role', 'Manager');
  const badge = screen.getByLabelText('Number of filters applied');
  expect(badge).toHaveTextContent('1');
  activateSelectFilter('Privacy', 'Public');
  expect(badge).toHaveTextContent('2');
});
