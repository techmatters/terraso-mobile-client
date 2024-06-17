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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {ListButton} from 'terraso-mobile-client/components/buttons/list/ListButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

export function DeleteAccountButton() {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const onDeleteAccount = useCallback(
    () => navigation.navigate('DELETE_ACCOUNT'),
    [navigation],
  );

  return (
    <ListButton
      type="error"
      iconName="delete"
      labelText={t('settings.delete_account')}
      onPress={onDeleteAccount}
    />
  );
}
