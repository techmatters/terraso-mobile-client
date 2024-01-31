/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {Badge, Input, Modal, Button, useDisclose} from 'native-base';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {Row, Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  query: string;
  setQuery: (query: string) => void;
  FilterOptions?: React.ReactNode;
  numFilters?: number;
  onApplyFilter?: () => void;
  placeholder: string;
  filterIcon?: string;
} & React.ComponentProps<typeof Row>;

export const SearchBar = ({
  query,
  setQuery,
  FilterOptions,
  numFilters,
  onApplyFilter,
  placeholder,
  filterIcon = 'filter-list',
  ...rowProps
}: Props) => {
  const {t} = useTranslation();
  const {isOpen, onOpen, onClose} = useDisclose();
  const onApply = useCallback(() => {
    onApplyFilter && onApplyFilter();
    onClose();
  }, [onApplyFilter, onClose]);
  const onClear = useCallback(() => setQuery(''), [setQuery]);

  return (
    <Row mb="25px" {...rowProps}>
      {FilterOptions && (
        <Box alignSelf="center" pr="13px" pt="3px" mr="16px">
          {(numFilters ?? 0) > 0 && (
            <Badge
              position="absolute"
              top="0"
              right="0"
              rounded="full"
              px="6.5px"
              zIndex={1}
              bg="primary.lighter"
              _text={{
                fontSize: '12px',
              }}>
              {numFilters}
            </Badge>
          )}
          <IconButton
            name={filterIcon}
            bg="primary.contrast"
            rounded="full"
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
        InputRightElement={
          query.length === 0 ? undefined : (
            <IconButton name="close" onPress={onClear} />
          )
        }
      />
    </Row>
  );
};
