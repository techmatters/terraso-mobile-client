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

import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native-gesture-handler';

import {ScreenBackButton} from 'terraso-mobile-client/components/buttons/icons/appBar/ScreenBackButton';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useUserDeletionRequests} from 'terraso-mobile-client/hooks/userDeletionRequest.ts';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {DeleteAccountConfirmContent} from 'terraso-mobile-client/screens/DeleteAccountScreen/components/DeleteAccountConfirmContent';
import {DeleteAccountConfirmForm} from 'terraso-mobile-client/screens/DeleteAccountScreen/components/DeleteAccountConfirmForm';
import {DeleteAccountPendingContent} from 'terraso-mobile-client/screens/DeleteAccountScreen/components/DeleteAccountPendingContent';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

export function DeleteAccountScreen() {
  const {t} = useTranslation();
  const {user, isPending, isSaving, requestDeletion} =
    useUserDeletionRequests();

  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={<ScreenBackButton />} />}>
      <ScrollView>
        <ScreenContentSection title={t('delete_account.title')}>
          {user &&
            (isPending ? (
              <DeleteAccountPendingContent user={user} />
            ) : (
              <Column space="16px">
                <DeleteAccountConfirmContent user={user} />
                <DeleteAccountConfirmForm
                  user={user}
                  isSaving={isSaving}
                  onConfirm={requestDeletion}
                />
              </Column>
            ))}
        </ScreenContentSection>
      </ScrollView>
    </ScreenScaffold>
  );
}
