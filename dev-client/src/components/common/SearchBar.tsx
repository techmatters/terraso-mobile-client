import {Badge, HStack, Input, VStack} from 'native-base';
import {IconButton, Icon} from './Icons';
import {useTranslation} from 'react-i18next';

type SearchProps<T> = {
  selected: T[];
  onChangeText?: () => void;
};

type SearchInputProps = {
  onChangeText?: () => void;
};

export function SearchInput({onChangeText}: SearchInputProps) {
  const {t} = useTranslation();
  return (
    <Input
      placeholder={t('search.placeholder') || undefined}
      size="sm"
      bg="background.default"
      flexGrow={1}
      ml={2}
      maxHeight={8}
      onChangeText={onChangeText}
      InputLeftElement={<Icon name="search" ml={3} />}
    />
  );
}

export default function SearchBar<T extends object>({
  selected,
  onChangeText,
}: SearchProps<T>) {
  return (
    <HStack alignContent="center">
      <VStack>
        <Badge
          alignSelf="flex-end"
          mb={-5}
          mr={-2}
          py={0}
          rounded="full"
          zIndex={1}
          bg="none">
          {selected.length}
        </Badge>
        <IconButton
          name="filter-list"
          color="grey.200"
          _icon={{color: 'action.active', size: 'sm'}}
        />
      </VStack>
      <SearchInput onChangeText={onChangeText} />
    </HStack>
  );
}
