import {
  Button,
  FormControl,
  HStack,
  Input,
  Select,
  VStack,
  useDisclose,
} from 'native-base';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import EmbadgedIcon from 'terraso-mobile-client/components/common/EmbadgedIcon';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {useTranslation} from 'react-i18next';
import {Modal} from 'terraso-mobile-client/components/common/Modal';

type Lookup<Item> = {record?: Record<string, string>; key: keyof Item};

type FilterFn<Item> =
  | {
      kind: 'filter';
      f: (val: string) => (comp: string) => boolean;
      preprocess?: (val: string) => string;
      lookup: Lookup<Item>;
      hide?: true;
    }
  | {
      kind: 'sorting';
      f: (val: string) => (item: Item[]) => Item[];
      lookup: Lookup<Item>;
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
        .filter(([, f]) => !('hide' in f && f.hide))
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
            let getFilterVal: (val: Item) => string;
            if (fn.lookup.record !== undefined) {
              getFilterVal = (val: Item) =>
                fn.lookup.record![String(val[fn.lookup.key as keyof Item])];
            } else {
              getFilterVal = (val: Item) => String(val[fn.lookup.key]);
            }
            return x.filter(item => fn.f(processed)(getFilterVal(item)));

          case 'sorting':
            return fn.f(currentVal)(x);
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

type SelectFilterProps<Item, FilterNames extends string> = {
  placeholder: string;
  label: string;
  options: Record<string, string>;
  itemKey: keyof Item;
  lookup?: Record<string, string>;
  name: FilterNames;
};

export const SelectFilter = <Item, FilterNames extends string>({
  name,
  itemKey,
  options,
  placeholder,
  label,
  lookup,
}: SelectFilterProps<Item, FilterNames>) => {
  const {setValue, value} = useListFilter<Item>(name);

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

type FilterModalBodyProps = React.PropsWithChildren;

export const FilterModalBody = memo(({children}: FilterModalBodyProps) => {
  const {t} = useTranslation();
  const {applyFilters} = useListFilter<any>();
  const {onClose: closeModal} = useDisclose();

  const onPress = useCallback(() => {
    applyFilters();
    closeModal();
  }, [applyFilters, closeModal]);

  return (
    <VStack space="25px" my="25px" testID="MODAL">
      {children}
      <Button onPress={onPress}>{t('general.apply')}</Button>
    </VStack>
  );
});

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
  return (
    <Modal
      trigger={onOpen => (
        <FilterModalTrigger onOpen={onOpen}>{searchInput}</FilterModalTrigger>
      )}>
      <FilterForwarder value={value}>
        <FilterModalBody>{children}</FilterModalBody>
      </FilterForwarder>
    </Modal>
  );
};
