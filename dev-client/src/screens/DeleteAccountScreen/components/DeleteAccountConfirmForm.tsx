/*
 * Copyright © 2024 Technology Matters
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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {Button} from 'native-base';

import {User} from 'terraso-client-shared/account/accountSlice';

import {TextInput} from 'terraso-mobile-client/components/inputs/TextInput';
import {Column, Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

export type DeleteAccountConfirmFormProps = {
  user: User;
  onConfirm: () => void;
};

export function DeleteAccountConfirmForm({
  user,
  onConfirm,
}: DeleteAccountConfirmFormProps) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.pop(), [navigation]);

  const email = user.email;
  const [value, setValue] = useState('');
  const isDisabled = email !== value;

  return (
    <Column space="24px" paddingVertical="16px">
      <TextInput value={value} onChangeText={setValue} />
      <Row space="8px" marginHorizontal="24px" alignSelf="flex-end">
        <Button
          onPress={goBack}
          variant="outline"
          size="lg"
          background="grey.200"
          _text={{
            color: 'text.primary',
          }}>
          {t('delete_account.confirm.cancel')}
        </Button>
        <Button
          onPress={onConfirm}
          isDisabled={isDisabled}
          variant="solid"
          size="lg"
          background="error.main"
          _disabled={{
            background: 'action.disabledBackground',
            _text: {
              color: 'action.disabled',
            },
          }}
          _text={{color: 'error.contrast'}}>
          {t('delete_account.confirm.delete')}
        </Button>
      </Row>
    </Column>
  );
}
