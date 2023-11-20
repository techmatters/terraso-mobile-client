import {Button, FormControl, HStack, Input, Select, VStack} from 'native-base';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import EmbadgedIcon from 'terraso-mobile-client/components/common/EmbadgedIcon';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {useTranslation} from 'react-i18next';
import {
  Modal,
  ModalMethods,
} from 'terraso-mobile-client/components/common/Modal';

type Lookup<Item> = {
  record?: Record<string, string | undefined>;
  key: keyof Item;
};

type SortingOption<Item> = {
  order: 'ascending' | 'descending';
} & Lookup<Item>;

type FilterFn<Item> =
  | {
      kind: 'filter';
      f: (val: string) => (comp: string | undefined) => boolean;
      preprocess?: (val: string) => string;
      lookup: Lookup<Item>;
      hide?: true;
    }
  | {
      kind: 'sorting';
      options: Record<string, SortingOption<Item>>;
    };

export type ListFilterState<Item, FilterNames extends string> = {
  filteredItems: Item[];
  values: Record<string, string | undefined>;
  setValue: (key: FilterNames) => (newValue: string | undefined) => void;
  applyFilters: () => void;
  numFilters: number;
};

const ListFilterContext = createContext<ListFilterState<any, any>>({
  filteredItems: [],
  values: {},
  setValue: () => () => {},
  applyFilters: () => {},
  numFilters: 0,
});

type ContextHook<Item, Name> = Name extends string
  ? {
      setValue: (newValue: string | undefined) => void;
      value: string | undefined;
      applyFilters: () => void;
      numFilters: number;
    }
  : {applyFilters: () => void; numFilters: number; filteredItems: Item[]};

type ProviderProps<Item, Filters extends string> = {
  items: Item[];
  filters: {[Property in Filters]: FilterFn<Item>};
} & React.PropsWithChildren;

export const ListFilterProvider = <Item, Filters extends string>({
  items,
  filters,
  children,
}: ProviderProps<Item, Filters>) => {
  const [values, setValues] = useState<Record<string, string | undefined>>({});
  const [needsUpdate, setNeedsUpdate] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] = useState<Item[]>(items);

  const setValue = (name: string) => (newValue: string | undefined) =>
    setValues(state => ({...state, [name]: newValue}));

  const numFilters = useMemo(
    () =>
      Object.entries<FilterFn<Item>>(filters)
        .filter(([, f]) => f.kind === 'filter' && !('hide' in f && f.hide))
        .map(([name]) => values[name])
        .filter(val => val !== undefined).length,
    [values, filters],
  );

  const applyFilters = useCallback(
    () => setNeedsUpdate(true),
    [setNeedsUpdate],
  );

  const itemsWithFiltersApplied = useMemo(() => {
    const res: Item[] = Object.entries<FilterFn<Item>>(filters).reduce(
      (x, [name, fn]) => {
        const currentVal = values[name];
        if (currentVal === undefined) {
          return x;
        }
        switch (fn.kind) {
          case 'filter':
            let processed = currentVal;
            if (fn.preprocess) {
              processed = fn.preprocess(processed);
            }
            let getFilterVal: (val: Item) => string | undefined;
            if (fn.lookup.record !== undefined) {
              getFilterVal = (val: Item) =>
                fn.lookup.record![String(val[fn.lookup.key as keyof Item])];
            } else {
              getFilterVal = (val: Item) => String(val[fn.lookup.key]);
            }
            return x.filter(item => fn.f(processed)(getFilterVal(item)));

          case 'sorting':
            const options = fn.options[name];
            if (options === undefined) {
              console.warn(
                'Trying to sort with an undefined sorting configuration; ignoring',
              );
              return x;
            }
            const {key, record: lookupRecord, order} = options;
            const getValue = (a: Item) =>
              String(
                lookupRecord === undefined
                  ? a[key]
                  : lookupRecord[String(a[key])],
              );
            return x.sort((a, b) => {
              const valA = getValue(a);
              const valB = getValue(b);
              if (order === 'ascending') {
                return valA?.localeCompare(valB);
              } else {
                return valB?.localeCompare(valA);
              }
            });
        }
      },
      items,
    );
    return res;
  }, [items, values, filters]);

  useEffect(() => {
    if (needsUpdate) {
      setFilteredItems(itemsWithFiltersApplied);
      setNeedsUpdate(false);
    }
  }, [itemsWithFiltersApplied, needsUpdate, setNeedsUpdate]);

  // reload filtered items if items changes
  useEffect(() => {
    setNeedsUpdate(true);
  }, [items]);

  const value: ListFilterState<Item, Filters> = {
    values,
    filteredItems,
    setValue,
    applyFilters,
    numFilters,
  };

  return (
    <ListFilterContext.Provider value={value}>
      {children}
    </ListFilterContext.Provider>
  );
};

export const FilterForwarder = <Item, Filters extends string>({
  value,
  children,
}: {
  value: ListFilterState<Item, Filters>;
} & React.PropsWithChildren) => {
  return (
    <ListFilterContext.Provider value={value}>
      {children}
    </ListFilterContext.Provider>
  );
};

export function useListFilter<Item>(): ContextHook<Item, undefined>;
export function useListFilter<Item>(name: string): ContextHook<Item, string>;
export function useListFilter<Item>(
  name?: string,
): ContextHook<Item, typeof name> {
  const {values, setValue, ...common} = useContext(ListFilterContext);
  if (name === undefined) {
    return common;
  }
  return {
    value: values[name],
    setValue: setValue(name),
    ...common,
  };
}

type SelectFilterProps<FilterNames extends string> = {
  placeholder?: string;
  label: string;
  options: Record<string, string>;
  name: FilterNames;
};

export const SelectFilter = <FilterNames extends string>({
  name,
  options,
  placeholder,
  label,
}: SelectFilterProps<FilterNames>) => {
  const {setValue, value} = useListFilter<any>(name);

  const onValueChange = useCallback(
    (newValue: string) => {
      return setValue(newValue);
    },
    [setValue],
  );

  return (
    <FormControl>
      <FormControl.Label>{label}</FormControl.Label>
      <Select
        selectedValue={value}
        onValueChange={onValueChange}
        placeholder={placeholder}>
        {Object.entries(options).map(([optionKey, itemLabel]) => (
          <Select.Item value={optionKey} key={optionKey} label={itemLabel} />
        ))}
      </Select>
    </FormControl>
  );
};

type TextInputProps = {
  placeholder: string;
  label: string;
  name: string;
};

export const TextInputFilter = <Item,>({
  placeholder,
  label,
  name,
}: TextInputProps) => {
  const {t} = useTranslation();
  const {value, setValue, applyFilters} = useListFilter<Item>(name);

  const onChangeText = useCallback(
    (newText: string) => {
      setValue(newText);
      applyFilters();
    },
    [setValue, applyFilters],
  );

  const clearText = useCallback(() => onChangeText(''), [onChangeText]);

  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={label}
      flex={1}
      bg="background.default"
      pl="8px"
      py="6px"
      InputLeftElement={<Icon ml="16px" name="search" />}
      InputRightElement={
        value !== undefined && value.length ? (
          <IconButton
            name="close"
            onPress={clearText}
            accessibilityLabel={t('listfilter.clear_search_label')}
            _icon={{
              color: 'action.active',
            }}
          />
        ) : undefined
      }
    />
  );
};

type FilterModalBodyProps = {onClose?: () => void} & React.PropsWithChildren;

export const FilterModalBody = ({onClose, children}: FilterModalBodyProps) => {
  const {t} = useTranslation();
  const {applyFilters} = useListFilter<any>();

  const onPress = useCallback(() => {
    applyFilters();
    if (onClose) {
      onClose();
    }
  }, [applyFilters, onClose]);

  return (
    <VStack space="25px" my="25px" testID="MODAL">
      {children}
      <Button onPress={onPress}>{t('general.apply')}</Button>
    </VStack>
  );
};

type FilterModalTriggerProps = {
  onOpen: () => void;
} & React.PropsWithChildren;

export const FilterModalTrigger = ({
  onOpen,
  children,
}: FilterModalTriggerProps) => {
  const {t} = useTranslation();
  const {numFilters} = useListFilter<any>();

  return (
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
      {children}
    </HStack>
  );
};

type ModalProps = {searchInput: React.ReactNode} & React.PropsWithChildren;

export const ListFilterModal = ({searchInput, children}: ModalProps) => {
  // exceptionally do not use hook here; need to pass the context value to the modal
  const value = useContext(ListFilterContext);
  const ref = useRef<ModalMethods>(null);
  const onClose = useCallback(() => {
    if (ref.current !== null) {
      ref.current.onClose();
    }
  }, [ref]);

  return (
    <Modal
      ref={ref}
      trigger={onOpen => (
        <FilterModalTrigger onOpen={onOpen}>{searchInput}</FilterModalTrigger>
      )}>
      <FilterForwarder value={value}>
        <FilterModalBody onClose={onClose}>{children}</FilterModalBody>
      </FilterForwarder>
    </Modal>
  );
};
