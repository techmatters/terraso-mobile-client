import {Badge, HStack, Input, VStack} from 'native-base';
import MaterialIconButton from './MaterialIconButton';
import {useTranslation} from 'react-i18next';

type SearchProps<T> = {
  selected: T[];
  onChangeText?: () => void;
};

export default function SearchBar<T extends object>({
  selected,
  onChangeText,
}: SearchProps<T>) {
  const {t} = useTranslation();

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
        <MaterialIconButton
          name="filter-list"
          iconButtonProps={{color: 'grey.200'}}
          iconProps={{color: 'action.active', size: 'sm'}}
        />
      </VStack>
      {/* TODO: translation function returns null, but placeholder only accepts
        undefined */}
      <Input
        placeholder={t('search.placeholder') || undefined}
        size="sm"
        bg="background.default"
        flexGrow={1}
        ml={2}
        maxHeight={8}
        onChangeText={onChangeText}
      />
    </HStack>
  );
}
