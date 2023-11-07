import {Button, Input, Select} from 'native-base';
import {useCallback, useMemo, useState} from 'react';
import {Modal} from './Modal';

type Getter<Item> = keyof Item | ((item: Item) => string);

type InputFilterConfig<Item> = {
  key: Getter<Item>;
  placeholder: string;
};

type SelectFilterConfig<Item> = {
  label: string;
  key: keyof Item;
  lookup: Record<string, string>;
  choices: Record<string, string>;
};

export type FilterConfigOptions<Item> = {
  inputFilter: InputFilterConfig<Item>;
  selectFilters?: Record<symbol, SelectFilterConfig<Item>>;
};

const getValue = <Item,>(item: Item, key: Getter<Item>) => {
  if (!(key instanceof Function)) {
    return String(item[key]);
  }
  return key(item);
};

export const useListFilter = <ItemType,>(
  {inputFilter, selectFilters}: FilterConfigOptions<ItemType>,
  data: ItemType[],
) => {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(data);
  const [selectFilterValues, setSelectFilterValues] = useState<
    Record<symbol, string | null>
  >(
    Object.getOwnPropertySymbols(selectFilters || {}).reduce(
      (x, y) => ({...x, [y]: null}),
      {},
    ),
  );

  const selectFiltered = useMemo(() => {
    const ids = Object.getOwnPropertySymbols(selectFilters ?? {});
    let result = filteredItems;
    for (const id of ids) {
      const {key, lookup} = selectFilters![id];
      result = result.filter(item => {
        const value = lookup ? item[key] : lookup[key];
        return value === selectFilterValues[id];
      });
    }
    return result;
  }, [filteredItems, selectFilterValues]);

  const selectFilterUpdate = useCallback(
    (id: symbol) => (newValue: string) => {
      setSelectFilterValues(state => {
        return {...state, [id]: newValue};
      });
    },
    [setSelectFilterValues],
  );

  const applyFilter = useCallback(() => {
    setFilteredItems(selectFiltered);
  }, [selectFiltered, setFilteredItems]);

  const searchFiltered = useMemo(() => {
    return selectFiltered.filter(item =>
      getValue(item, inputFilter.key).includes(query),
    );
  }, [query, selectFiltered, getValue]);

  return {
    query,
    filteredItems: searchFiltered,
    selectFilterUpdate,
    setQuery,
    applyFilter,
  };
};

type FilterModalProps<Item> = {
  selectFilters?: Record<symbol, SelectFilterConfig<Item>>;
  selectFilterUpdate: (symbol: symbol) => (newValue: string) => void;
  applyFilter: () => void;
};

const FilterModalBody = <Item,>({
  selectFilters,
  selectFilterUpdate,
  applyFilter,
}: FilterModalProps<Item>) => {
  const filters = useMemo(
    () =>
      selectFilters === undefined
        ? []
        : Object.getOwnPropertySymbols(selectFilters).map(symbol => {
            const config = selectFilters[symbol];
            const options = Object.entries(config.choices).map(
              ([value, label]) => (
                <Select.Item value={value} label={label} key={value} />
              ),
            );
            return (
              <Select
                onValueChange={selectFilterUpdate(symbol)}
                key={String(symbol)}>
                {options}
              </Select>
            );
          }),
    [selectFilters, selectFilterUpdate],
  );
  return (
    <>
      {filters}
      <Button onPress={applyFilter}>Apply</Button>
    </>
  );
};

export type ListFilterProps<Item> = {
  items: Item[];
  options: FilterConfigOptions<Item>;
  children: (value: {
    filteredItems: Item[];
    InputFilter: React.ReactNode;
  }) => React.ReactNode;
};

const ListFilter = <Item,>({
  items,
  options,
  children,
}: ListFilterProps<Item>) => {
  const {filteredItems, selectFilterUpdate, applyFilter, setQuery, query} =
    useListFilter(options, items);
  const InputFilter = (
    <>
      <Modal trigger={onOpen => <Button onPress={onOpen}>See Filters</Button>}>
        <FilterModalBody
          selectFilters={options.selectFilters}
          selectFilterUpdate={selectFilterUpdate}
          applyFilter={applyFilter}
        />
      </Modal>
      <Input
        onChangeText={setQuery}
        value={query}
        placeholder={options.inputFilter.placeholder}
      />
    </>
  );
  return children({filteredItems, InputFilter});
};

export default ListFilter;
