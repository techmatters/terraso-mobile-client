import {Badge, Row, Box, Input, Modal, Button, useDisclose} from 'native-base';
import {Icon, IconButton} from '../Icons';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {CardCloseButton} from '../Card';

type SearchBarProps = {
  query: string;
  setQuery: (query: string) => void;
  FilterOptions?: React.ReactNode;
  numFilters?: number;
  onApplyFilter?: () => void;
  placeholder: string;
} & React.ComponentProps<typeof Row>;
export const SearchBar = ({
  query,
  setQuery,
  FilterOptions,
  numFilters,
  onApplyFilter,
  placeholder,
  ...rowProps
}: SearchBarProps) => {
  const {t} = useTranslation();
  const {isOpen, onOpen, onClose} = useDisclose();
  const onApply = useCallback(() => {
    onApplyFilter && onApplyFilter();
    onClose();
  }, [onApplyFilter, onClose]);

  return (
    <Row mb="25px" {...rowProps}>
      {FilterOptions && (
        <Box alignSelf="center" paddingRight="13px" paddingTop="3px" mr="16px">
          {(numFilters ?? 0) > 0 && (
            <Badge
              position="absolute"
              top="0"
              right="0"
              rounded="full"
              px="6.5px"
              zIndex={1}
              bg="primary.lightest"
              _text={{
                fontSize: '12px',
              }}>
              {numFilters}
            </Badge>
          )}
          <IconButton
            name="filter-list"
            bg="primary.contrast"
            borderRadius="full"
            _icon={{color: 'action.active', size: 'sm'}}
            onPress={onOpen}
          />
          <Modal isOpen={isOpen} onClose={onClose}>
            <Modal.Content>
              <CardCloseButton onPress={onClose} />
              <Box pt="50px" pb="28px" px="16px">
                {FilterOptions}
                <Button
                  mt="32px"
                  size="lg"
                  alignSelf="center"
                  onPress={onApply}>
                  {t('general.apply')}
                </Button>
              </Box>
            </Modal.Content>
          </Modal>
        </Box>
      )}
      <Input
        placeholder={placeholder}
        placeholderTextColor="text.primary"
        bg="background.default"
        flexGrow={1}
        pl="8px"
        py="6px"
        value={query}
        onChangeText={setQuery}
        InputLeftElement={<Icon ml="16px" name="search" />}
      />
    </Row>
  );
};
