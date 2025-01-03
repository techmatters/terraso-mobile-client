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

import {User} from 'terraso-client-shared/account/accountSlice';

import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {TextInput} from 'terraso-mobile-client/components/inputs/TextInput';
import {Column, Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

export type DeleteAccountConfirmFormProps = {
  user: User;
  isSaving: boolean;
  onConfirm: () => void;
};

export function DeleteAccountConfirmForm({
  user,
  isSaving,
  onConfirm,
}: DeleteAccountConfirmFormProps) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.pop(), [navigation]);

  const email = user.email;
  const [value, setValue] = useState('');
  const isEmailConfirmed = email !== value;

  return (
    <Column space="24px">
      <TextInput
        value={value}
        onChangeText={setValue}
        autoComplete="email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Row space="8px" alignSelf="flex-end">
        <DialogButton
          onPress={goBack}
          type="outlined"
          label={t('delete_account.confirm.cancel')}
        />
        <DialogButton
          onPress={onConfirm}
          disabled={isEmailConfirmed || isSaving}
          type="destructive"
          label={t('delete_account.confirm.delete')}
        />
      </Row>
    </Column>
  );
}
