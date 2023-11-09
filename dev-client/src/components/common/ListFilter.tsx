import {Button, FormControl, HStack, Input, Select, VStack} from 'native-base';
import {useCallback, useMemo, useRef, useState} from 'react';
import {
  Modal,
  ModalMethods,
} from 'terraso-mobile-client/components/common/Modal';
import EmbadgedIcon from 'terraso-mobile-client/components/common/EmbadgedIcon';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {normalizeText} from 'terraso-mobile-client/util';
import {useTranslation} from 'react-i18next';

type Getter<Item> = keyof Item | ((item: Item) => string);

type InputFilterConfig<Item> = {
  key: Getter<Item>;
};

type SelectFilterConfig<Item, S> = {
  key: keyof Item;
  lookup?: Record<string, S[keyof S]>;
};

export type FilterConfig<Item, S> = {
  textInput: InputFilterConfig<Item>;
  select?: Record<keyof S, SelectFilterConfig<Item, S>>;
};

export type OptionMapping<T> = {[Property in keyof T]: string};

type FilterModalProps<SelectIDs extends OptionMapping<SelectIDs>> = {
  selectFilters?: SelectFilterDisplayConfig<SelectIDs>;
  selectFilterUpdate: (id: keyof SelectIDs) => (newValue: string) => void;
  filterValues: Record<keyof SelectIDs, string | null>;
  applyFilter: () => void;
};

type FilterDisplayConfig = {
  placeholder: string;
};

type TextInputFilterDisplayConfig = FilterDisplayConfig;

type SelectFilterDisplayConfig<T extends OptionMapping<T>> = {
  [Property in keyof T]: {
    options: Record<T[Property], string>;
    label: string;
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

  const normalizedQuery = useMemo(() => normalizeText(query), [query]);

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
  }, [data, selectFilterValues, selectFilters]);

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
    return filteredItems.filter(item => {
      const normalizedValue = normalizeText(getValue(item, inputFilter.key));
      return normalizedValue.indexOf(normalizedQuery) !== -1;
    });
  }, [filteredItems, normalizedQuery, inputFilter]);

  return {
    query,
    filteredItems: searchFiltered,
    selectFilterUpdate,
    selectFilterValues,
    setQuery,
    applyFilter,
  };
};

const FilterModalBody = <SelectIDs extends OptionMapping<SelectIDs>>({
  selectFilters,
  selectFilterUpdate,
  filterValues,
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
        <FormControl key={selectKey}>
          <FormControl.Label>{selectLabel}</FormControl.Label>
          <Select
            placeholder={selectPlaceholder}
            onValueChange={selectFilterUpdate(selectKey)}
            selectedValue={filterValues[selectKey] || undefined}
            dropdownIcon={<Icon name="arrow-drop-down" />}
            color="text.primary"
            variant="underlined">
            {items}
          </Select>
        </FormControl>,
      );
    }
    return selects;
  }, [selectFilters, selectFilterUpdate, filterValues]);

  return (
    <VStack space="25px" my="25px">
      {filters}
      <Button onPress={applyFilter}>Apply</Button>
    </VStack>
  );
};

const ListFilter = <Item, SelectIDs extends OptionMapping<SelectIDs>>({
  items,
  filterConfig,
  displayConfig,
  children,
}: ListFilterProps<Item, SelectIDs>) => {
  const {t} = useTranslation();
  const {
    filteredItems,
    selectFilterUpdate,
    selectFilterValues,
    applyFilter,
    setQuery,
    query,
  } = useListFilter(filterConfig, items);
  const modalRef = useRef<ModalMethods>(null);
  const applyCallback = useCallback(() => {
    applyFilter();
    if (modalRef.current) {
      modalRef.current.onClose();
    }
  }, [modalRef, applyFilter]);

  const numFilters = useMemo(
    () =>
      Object.values(selectFilterValues).filter(item => item !== null).length,
    [selectFilterValues],
  );

  const clearTextInputFilter = useCallback(() => {
    setQuery('');
  }, [setQuery]);

  const InputFilter = (
    <>
      <Modal
        trigger={onOpen => (
          <HStack space="20px" mb="15px">
            <EmbadgedIcon
              iconName="filter-list"
              onPress={onOpen}
              badgeNum={numFilters}
              accessibilityLabel={t('listfilter.open_modal_label')}
              _badge={{
                accessibilityLabel: t('listfilter.num_filters_label'),
              }}
              _iconButton={{
                variant: 'filterIcon',
              }}
            />
            <Input
              accessibilityLabel={t('listfilter.text_input_label')}
              flex={1}
              onChangeText={setQuery}
              value={query}
              placeholder={displayConfig.textInput.placeholder}
              bg="background.default"
              pl="8px"
              py="6px"
              InputLeftElement={<Icon ml="16px" name="search" />}
              InputRightElement={
                query.length === 0 ? undefined : (
                  <IconButton
                    name="close"
                    onPress={clearTextInputFilter}
                    accessibilityLabel={t('listfilter.clear_search_label')}
                    _icon={{
                      color: 'action.active',
                    }}
                  />
                )
              }
            />
          </HStack>
        )}
        ref={modalRef}>
        <FilterModalBody
          selectFilters={displayConfig.select}
          selectFilterUpdate={selectFilterUpdate}
          filterValues={selectFilterValues}
          applyFilter={applyCallback}
        />
      </Modal>
    </>
  );
  return children({filteredItems, InputFilter});
};

export default ListFilter;
