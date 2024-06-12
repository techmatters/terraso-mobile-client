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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import CheckBox from '@react-native-community/checkbox';
import {FormControl} from 'native-base';

import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  SWITCH_PADDING,
  SWITCH_VERTICAL_PADDING,
} from 'terraso-mobile-client/theme';

type CheckboxProps = {
  label: string;
  id: string;
  checked: boolean;
};

type Props = {
  checkboxes: CheckboxProps[];
  groupName: string;
  groupId: string | symbol;
  onChangeValue: (
    groupId: string | symbol,
    checkboxId: string,
  ) => (checked: boolean) => void;
};

export const CheckboxGroup = ({
  checkboxes,
  groupName,
  groupId,
  onChangeValue,
}: Props) => {
  const {t} = useTranslation();

  const selectAllChecked = useMemo(() => {
    return checkboxes.every(({checked}) => checked);
  }, [checkboxes]);

  const onSelectAll = useCallback(() => {
    checkboxes.forEach(({id: checkboxId}) =>
      onChangeValue(groupId, checkboxId)(!selectAllChecked),
    );
  }, [checkboxes, selectAllChecked, onChangeValue, groupId]);

  return (
    <Box>
      <Row>
        <CheckBox
          id={`select-all-${groupName}`}
          onValueChange={onSelectAll}
          value={selectAllChecked}
        />
        <FormControl.Label
          htmlFor={`select-all-${groupName}`}
          variant="body1"
          pl={SWITCH_PADDING}>
          {t('general.select_all')}
        </FormControl.Label>
      </Row>
      <Column px="20px">
        {checkboxes.map(({label, id, checked}) => (
          <Row
            key={id}
            mt={SWITCH_VERTICAL_PADDING}
            mb={SWITCH_VERTICAL_PADDING}>
            <CheckBox
              id={'checkbox-' + id}
              onValueChange={onChangeValue(groupId, id)}
              value={checked}
            />
            <FormControl.Label
              htmlFor={'checkbox-' + id}
              variant="body1"
              pl={SWITCH_PADDING}>
              {label}
            </FormControl.Label>
          </Row>
        ))}
      </Column>
    </Box>
  );
};
