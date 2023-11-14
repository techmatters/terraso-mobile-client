import {render, screen, fireEvent} from '@testing-library/react-native';
import {NativeBaseProvider} from 'native-base';
import ListFilter, {
  useSearch,
} from 'terraso-mobile-client/components/common/ListFilter';
import {theme} from 'terraso-mobile-client/theme';
import {useEffect} from 'react';

const sampleObjects = [
  {name: 'Passes filter', filter: true},
  {name: 'Fails filter', filter: false},
];

const inset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

const Test = ({mock, searchConfig}) => {
  const {filteredItems, query, onChangeText} = useSearch(
    searchConfig,
    sampleObjects,
  );

  useEffect(() => {
    mock(filteredItems);
  }, [filteredItems, mock]);

  return (
    <NativeBaseProvider theme={theme} initialWindowMetrics={inset}>
      <ListFilter
        query={query}
        onChangeText={onChangeText}
        placeholder="Search"
      />
    </NativeBaseProvider>
  );
};

test("Filter removes items that don't match query", async () => {
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
