import {Button, Input, Select, Text} from 'native-base';
import {useCallback, useMemo, useRef, useState} from 'react';
import {Modal, ModalMethods} from './Modal';

type Getter<Item> = keyof Item | ((item: Item) => string);

type InputFilterConfig<Item> = {
  key: Getter<Item>;
};

type SelectFilterConfig<Item, S> = {
  key: keyof Item;
  lookup: Record<string, S[keyof S]>;
};

export type FilterConfig<Item, S> = {
  textInput: InputFilterConfig<Item>;
  select?: Record<keyof S, SelectFilterConfig<Item, S>>;
};

export type OptionMapping<T> = {[Property in keyof T]: string};

type FilterModalProps<SelectIDs extends OptionMapping<SelectIDs>> = {
  selectFilters?: SelectFilterDisplayConfig<SelectIDs>;
  selectFilterUpdate: (id: keyof SelectIDs) => (newValue: string) => void;
  applyFilter: () => void;
};

type FilterDisplayConfig = {
  label: string;
  placeholder: string;
};

type TextInputFilterDisplayConfig = FilterDisplayConfig;

type SelectFilterDisplayConfig<T extends OptionMapping<T>> = {
  [Property in keyof T]: {
    options: Record<T[Property], string>;
  } & FilterDisplayConfig;
};

export type ListFilterProps<
  Item,
  SelectIDs extends {[Property in keyof SelectIDs]: string} = {},
> = {
  items: Item[];
  filterConfig: FilterConfig<Item, SelectIDs>;
  displayConfig: {
    textInput: TextInputFilterDisplayConfig;
    select?: SelectFilterDisplayConfig<SelectIDs>;
  };
  children: (value: {
    filteredItems: Item[];
    InputFilter: React.ReactNode;
  }) => React.ReactNode;
};

const getValue = <Item,>(item: Item, key: Getter<Item>) => {
  if (!(key instanceof Function)) {
    return String(item[key]);
  }
  return key(item);
};

export const useListFilter = <ItemType, S>(
  {textInput: inputFilter, select: selectFilters}: FilterConfig<ItemType, S>,
  data: ItemType[],
) => {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(data);
  const [selectFilterValues, setSelectFilterValues] = useState<
    Record<keyof S, string | null>
  >(
    Object.keys(selectFilters ?? {}).reduce(
      (x, y) => ({...x, [y]: null}),
      {} as Record<keyof S, string | null>,
    ),
  );

  const selectFiltered = useMemo(() => {
    if (selectFilters === undefined) {
      return data;
    }
    let result = data;
    for (const id in selectFilters) {
      if (selectFilterValues[id] === null) {
        // select filter unset, do not apply
        continue;
      }
      const {key, lookup} = selectFilters![id];
      result = result.filter(item => {
        const value = lookup ? lookup[String(item[key])] : item[key];
        return value === selectFilterValues[id];
      });
    }
    return result;
  }, [data, selectFilterValues]);

  const selectFilterUpdate = useCallback(
    (id: keyof S) => (newValue: string) => {
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
    return filteredItems.filter(item =>
      getValue(item, inputFilter.key).includes(query),
    );
  }, [query, filteredItems, getValue]);

  return {
    query,
    filteredItems: searchFiltered,
    selectFilterUpdate,
    setQuery,
    applyFilter,
  };
};

const FilterModalBody = <SelectIDs extends OptionMapping<SelectIDs>>({
  selectFilters,
  selectFilterUpdate,
  applyFilter,
}: FilterModalProps<SelectIDs>) => {
  const filters = useMemo(() => {
    if (selectFilters === undefined) {
      return [];
    }
    let selects = [];
    for (const selectKey in selectFilters) {
      const {
        options,
        label: selectLabel,
        placeholder: selectPlaceholder,
      } = selectFilters[selectKey];
      const items = [];
      for (const value in options) {
        const label = options[value as keyof typeof options];
        items.push(<Select.Item value={value} label={label} key={value} />);
      }
      selects.push(
        <>
          <Text>{selectLabel}</Text>
          <Select
            placeholder={selectPlaceholder}
            onValueChange={selectFilterUpdate(selectKey)}
            key={selectKey}>
            {items}
          </Select>
        </>,
      );
    }
    return selects;
  }, [selectFilters, selectFilterUpdate]);

  return (
    <>
      {filters}
      <Button onPress={applyFilter}>Apply</Button>
    </>
  );
};

const ListFilter = <Item, SelectIDs extends OptionMapping<SelectIDs>>({
  items,
  filterConfig,
  displayConfig,
  children,
}: ListFilterProps<Item, SelectIDs>) => {
  const {filteredItems, selectFilterUpdate, applyFilter, setQuery, query} =
    useListFilter(filterConfig, items);
  const modalRef = useRef<ModalMethods>(null);
  const applyCallback = useCallback(() => {
    applyFilter();
    if (modalRef.current) {
      modalRef.current.onClose();
    }
  }, [modalRef, applyFilter]);
  const InputFilter = (
    <>
      <Modal
        trigger={onOpen => <Button onPress={onOpen}>Select filters</Button>}>
        <FilterModalBody
          selectFilters={displayConfig.select}
          selectFilterUpdate={selectFilterUpdate}
          applyFilter={applyCallback}
        />
      </Modal>
      <Input
        onChangeText={setQuery}
        value={query}
        placeholder={displayConfig.textInput.placeholder}
      />
    </>
  );
  return children({filteredItems, InputFilter});
};

export default ListFilter;
