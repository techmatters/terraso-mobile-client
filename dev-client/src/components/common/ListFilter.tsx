import {Input} from 'native-base';
import {useCallback, useState} from 'react';

type SearchOptions<ItemType> = {
  key: keyof ItemType | ((item: ItemType) => string);
};

type SearchConfigOptions<ItemType> = {
  search: SearchOptions<ItemType>;
};

export const useSearch = <ItemType,>(
  {search}: SearchConfigOptions<ItemType>,
  data: ItemType[],
) => {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(data);

  let getValue: (item: ItemType) => string;
  if (!(search.key instanceof Function)) {
    getValue = (item: ItemType) => String(item[search.key as keyof ItemType]);
  } else {
    getValue = search.key;
  }

  const onChangeText = useCallback(
    (text: string) => {
      const newItems = data.filter(item => {
        let value = getValue(item);
        return value.includes(text);
      });
      setFilteredItems(newItems);
      setQuery(text);
    },
    [setQuery, setFilteredItems, data, getValue],
  );

  return {query, filteredItems, onChangeText};
};

type ListFilterProps = {
  onChangeText: (text: string) => void;
  query: string;
  placeholder: string;
};

const ListFilter = ({onChangeText, query, placeholder}: ListFilterProps) => {
  return (
    <Input
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={query}
    />
  );
};

export default ListFilter;
