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
import {StyleSheet} from 'react-native';

import {User} from 'terraso-client-shared/account/accountSlice';

import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {TextField} from 'terraso-mobile-client/components/inputs/TextField';
import {Column, Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {DeleteAccountReasonsField} from 'terraso-mobile-client/screens/DeleteAccountScreen/components/DeleteAccountReasonsField';
import {
  DeleteAccountFeedback,
  DeleteAccountReason,
} from 'terraso-mobile-client/screens/DeleteAccountScreen/deleteAccountFeedback';
import {theme} from 'terraso-mobile-client/theme';

export type DeleteAccountConfirmFormProps = {
  user: User;
  isSaving: boolean;
  isOffline: boolean;
  onConfirm: (feedback: DeleteAccountFeedback) => void;
};

export function DeleteAccountConfirmForm({
  user,
  isSaving,
  isOffline,
  onConfirm,
}: DeleteAccountConfirmFormProps) {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const goBack = useCallback(() => navigation.pop(), [navigation]);

  const email = user.email;
  const [value, setValue] = useState('');
  const isEmailConfirmed = email === value;

  const [reasons, setReasons] = useState<DeleteAccountReason[]>([]);
  const [details, setDetails] = useState('');
  const confirm = useCallback(
    () => onConfirm({reasons, details: details.trim()}),
    [onConfirm, reasons, details],
  );

  return (
    <Column>
      <DeleteAccountReasonsField value={reasons} onValueChange={setReasons} />
      <Column style={styles.spacer} />
      <TranslatedParagraph
        bold
        i18nKey="delete_account.feedback.details_prompt"
      />
      <TextField
        label={t('delete_account.feedback.details_label')}
        value={details}
        onChangeText={setDetails}
        multiline={true}
      />
      <TranslatedParagraph i18nKey="delete_account.confirm.p5" />
      <TextField
        label={t('general.email_label')}
        value={value}
        onChangeText={setValue}
        type="email"
        required={true}
        error={isEmailConfirmed ? undefined : t('delete_account.confirm.error')}
      />
      <Row space="8px" alignSelf="flex-end">
        <DialogButton
          onPress={goBack}
          type="outlined"
          label={t('delete_account.confirm.cancel')}
        />
        <DialogButton
          onPress={confirm}
          disabled={!isEmailConfirmed || isSaving || isOffline}
          type="destructive"
          label={t('delete_account.confirm.delete')}
        />
      </Row>
    </Column>
  );
}

const styles = StyleSheet.create({
  spacer: {
    height: theme.space.md,
  },
});
