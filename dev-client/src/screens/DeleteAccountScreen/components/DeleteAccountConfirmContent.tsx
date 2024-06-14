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

import {User} from 'terraso-client-shared/account/accountSlice';

import {TranslatedBulletList} from 'terraso-mobile-client/components/content/typography/TranslatedBulletList';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type DeleteAccountConfirmContentProps = {
  user: User;
};

export function DeleteAccountConfirmContent({
  user,
}: DeleteAccountConfirmContentProps) {
  const email = user.email;

  return (
    <Column>
      <TranslatedParagraph
        i18nKey="delete_account.confirm.p0"
        values={{email}}
      />
      <TranslatedParagraph i18nKey="delete_account.confirm.p1" />
      <TranslatedBulletList
        i18nKeys={[
          'delete_account.confirm.p2.b0',
          'delete_account.confirm.p2.b1',
        ]}
      />
      <TranslatedParagraph i18nKey="delete_account.confirm.p3" />
      <TranslatedBulletList
        i18nKeys={[
          'delete_account.confirm.p4.b0',
          'delete_account.confirm.p4.b1',
        ]}
      />
      <TranslatedParagraph i18nKey="delete_account.confirm.p5" />
    </Column>
  );
}
